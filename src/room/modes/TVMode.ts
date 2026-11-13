import * as THREE from 'three';
import type { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { HOME_VIEW } from '../Camera';
import { EVENTS, emit, type ActiveDetail } from '../events';
import type Renderer from '../Renderer';
import { getScreenGeo } from '../utils/screenGeo';
import FlyMode, { type FlyConfig, type FlyModeOptions } from './FlyMode';

/**
 * Analysis section 8.2, except the pose: the camera sits straight in front of
 * the TV, level with the screen's centre, and holds still (user request: flat,
 * like 2D, no angle). The spec's pose sat 0.87 to the side at sofa eye height
 * (2.1), looking 0.98 below the screen's centre, with a slight sway.
 */
const DISTANCE = 7.35;
const FOV = 33;
const ENTER_MS = 2400;
const EXIT_MS = 1800;

/** Depth of field: focus starts short of the TV and racks onto it at the end of the fly-in. */
const MAX_BLUR = 0.016;
const APERTURE = 0.0009;
const NEAR_FOCUS = 0.4; // times the distance to the TV
const RACK_FROM = 0.6; // fraction of the fly-in after which the focus moves

function poseFor(screen: THREE.Mesh): { config: FlyConfig; center: THREE.Vector3 } {
  const geo = getScreenGeo(screen, HOME_VIEW.target);
  const position = geo.center.clone().addScaledVector(geo.normal, DISTANCE);
  const target = geo.center.clone();
  const config: FlyConfig = { position, target, fov: FOV, enterMs: ENTER_MS, exitMs: EXIT_MS };
  return { config, center: geo.center };
}

/** The page's CSS gradient as a texture: the composer's output is opaque, so the scene needs it. */
function createGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas');
  ctx.fillStyle = '#dcd7cf';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // radial-gradient(120% 90% at 50% 38%, #fff 0, #f1eee8 55%, #dcd7cf)
  ctx.translate(canvas.width * 0.5, canvas.height * 0.38);
  ctx.scale(canvas.width * 1.2, canvas.height * 0.9);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, '#f1eee8');
  gradient.addColorStop(1, '#dcd7cf');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface TVModeOptions extends FlyModeOptions {
  renderer: Renderer;
  scene: THREE.Scene;
}

/**
 * Clicking the TV or the remote (analysis section 8.2): the camera sits down
 * on the sofa and the picture gets a shallow depth of field. `kai:tv-toggle`
 * enters, and leaves when sent again; `Esc` or a click on the room also leave.
 * `kai:tvmode {active}` is sent when the mode starts and when it starts to leave.
 *
 * The effect composer is downloaded and built on the first entry. Until it is
 * ready, or if it cannot be built, the mode runs on the plain render path.
 */
export default class TVMode extends FlyMode {
  private renderer: Renderer;
  private scene: THREE.Scene;
  private tvDistance: number;

  private composer: EffectComposer | null = null;
  private bokeh: BokehPass | null = null;
  private background: THREE.CanvasTexture | null = null;
  private building = false;
  private failed = false;
  private destroyed = false;
  private apertureAtExit = 0;

  constructor(options: TVModeOptions, screen: THREE.Mesh) {
    const pose = poseFor(screen);
    super(options, pose.config);
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.tvDistance = pose.config.position.distanceTo(pose.center);
    window.addEventListener(EVENTS.tvToggle, this.onToggle);
  }

  protected onEnter(): void {
    this.send(true);
    if (this.composer) this.postOn();
    else void this.build();
  }

  protected onExit(): void {
    this.apertureAtExit = this.bokeh ? (this.bokeh.uniforms as BokehUniforms).aperture.value : 0;
    this.send(false);
  }

  protected onLeft(): void {
    this.postOff();
  }

  protected onFrame(): void {
    if (!this.bokeh) return;
    const uniforms = this.bokeh.uniforms as BokehUniforms;
    const near = this.tvDistance * NEAR_FOCUS;
    if (this.phase === 'entering') {
      const k = THREE.MathUtils.clamp((this.progress - RACK_FROM) / (1 - RACK_FROM), 0, 1);
      uniforms.focus.value = THREE.MathUtils.lerp(near, this.tvDistance, k);
      uniforms.aperture.value = APERTURE * k;
    } else if (this.phase === 'active') {
      uniforms.focus.value = this.tvDistance;
      uniforms.aperture.value = APERTURE;
    } else {
      // Leaving: the blur is gone by the middle of the flight back.
      uniforms.aperture.value = this.apertureAtExit * Math.max(0, 1 - this.progress * 2);
    }
  }

  private async build(): Promise<void> {
    if (this.building || this.failed) return;
    this.building = true;
    try {
      const [{ EffectComposer }, { RenderPass }, { BokehPass }, { OutputPass }] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/BokehPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ]);
      if (this.destroyed) return;

      const scene = this.scene;
      const camera = this.camera.instance;

      /** The depth render must not include the background picture: its colours would read as depths. */
      class RoomBokehPass extends BokehPass {
        render(...args: Parameters<BokehPass['render']>): void {
          const background = scene.background;
          scene.background = null;
          super.render(...args);
          scene.background = background;
        }
      }

      const webgl = this.renderer.instance;
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      const composer = new EffectComposer(webgl, target);
      composer.addPass(new RenderPass(scene, camera));
      const bokeh = new RoomBokehPass(scene, camera, { focus: 1, aperture: 0, maxblur: MAX_BLUR });
      composer.addPass(bokeh);
      composer.addPass(new OutputPass());

      this.background = createGradientTexture();
      this.composer = composer;
      this.bokeh = bokeh;
      if (this.phase !== 'idle') this.postOn();
    } catch (error) {
      this.failed = true;
      console.warn('[room] TV mode runs without depth of field:', error);
    } finally {
      this.building = false;
    }
  }

  private postOn(): void {
    if (!this.composer) return;
    this.scene.background = this.background;
    this.renderer.setPost(this.composer);
    this.onFrame();
  }

  private postOff(): void {
    if (this.renderer.post !== this.composer) return;
    this.renderer.setPost(null);
    this.scene.background = null;
  }

  private send(active: boolean): void {
    const detail: ActiveDetail = { active };
    emit(EVENTS.tvMode, detail);
  }

  private onToggle = (): void => {
    if (this.phase === 'idle') this.enter();
    else this.exit();
  };

  destroy(): void {
    super.destroy();
    this.destroyed = true;
    window.removeEventListener(EVENTS.tvToggle, this.onToggle);
    if (this.composer) {
      this.postOff();
      // The composer frees its two render targets and copy pass; each pass (bokeh's own targets and materials, output) is freed here.
      for (const pass of this.composer.passes) pass.dispose();
      this.composer.dispose();
      this.composer = null;
      this.bokeh = null;
    }
    this.background?.dispose();
    this.background = null;
  }
}

type BokehUniforms = Record<'focus' | 'aperture' | 'maxblur', { value: number }>;
