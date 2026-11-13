import * as THREE from 'three';
import type Sizes from './utils/Sizes';
import type Camera from './Camera';

/** What the renderer needs from an effect composer. */
export interface PostChain {
  render(): void;
  setSize(width: number, height: number): void;
  setPixelRatio(pixelRatio: number): void;
}

/** Transparent canvas so the page gradient shows through. No tone mapping, no shadows. */
export default class Renderer {
  instance: THREE.WebGLRenderer;
  /** Set while a mode renders through an effect composer; the output is then opaque. */
  post: PostChain | null = null;
  /**
   * Called right after each render, while the drawing buffer still holds the
   * frame, so pixels can be read without `preserveDrawingBuffer`. Unused now.
   */
  afterRender: Array<() => void> = [];

  /** True between `webglcontextlost` and `webglcontextrestored`; nothing is drawn meanwhile. */
  contextLost = false;

  private sizes: Sizes;
  private scene: THREE.Scene;
  private camera: Camera;

  constructor(sizes: Sizes, scene: THREE.Scene, camera: Camera, target: HTMLElement) {
    this.sizes = sizes;
    this.scene = scene;
    this.camera = camera;

    this.instance = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.instance.setClearColor('#ffffff', 0);
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.NoToneMapping;

    const canvas = this.instance.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    target.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.resize();
  }

  /** Section 13.4: keep the page alive through a lost GPU context. */
  private onContextLost = (event: Event): void => {
    event.preventDefault(); // tells the browser we want the context back
    this.contextLost = true;
  };

  /** three.js rebuilds its GPU state itself; canvas and video textures need a fresh upload. */
  private onContextRestored = (): void => {
    this.contextLost = false;
    this.resize();
    this.scene.traverse((object) => {
      const materials = (object as THREE.Mesh).material;
      if (!materials) return;
      for (const material of Array.isArray(materials) ? materials : [materials]) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.CanvasTexture || value instanceof THREE.VideoTexture) value.needsUpdate = true;
        }
        if (material instanceof THREE.ShaderMaterial) {
          for (const uniform of Object.values(material.uniforms)) {
            const value = uniform.value;
            if (value instanceof THREE.CanvasTexture || value instanceof THREE.VideoTexture) value.needsUpdate = true;
          }
        }
      }
    });
    const background = this.scene.background;
    if (background instanceof THREE.CanvasTexture) background.needsUpdate = true;
  };

  resize(): void {
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    this.instance.setSize(this.sizes.width, this.sizes.height, false);
    this.post?.setPixelRatio(this.sizes.pixelRatio);
    this.post?.setSize(this.sizes.width, this.sizes.height);
  }

  /** Render through a post-processing chain (TV mode), or `null` for the plain path. */
  setPost(post: PostChain | null): void {
    this.post = post;
    if (post) this.resize();
  }

  render(): void {
    if (this.contextLost) return;
    if (this.post) this.post.render();
    else this.instance.render(this.scene, this.camera.instance);
    for (const callback of this.afterRender) callback();
  }

  destroy(): void {
    this.afterRender.length = 0;
    this.post = null;
    const canvas = this.instance.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
