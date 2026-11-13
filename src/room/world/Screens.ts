import * as THREE from 'three';
import type { ScreenName } from '../assets';
import type { ScreenContent } from './screens/CanvasScreen';
import MacScreen from './screens/MacScreen';
import TestPattern from './screens/TestPattern';
import VideoScreen from './screens/VideoScreen';
import Whiteboard from './screens/Whiteboard';

/** Same dark colour the room sources give a screen that is off. */
const SCREEN_OFF = '#15161a';

export interface ScreensOptions {
  /** URL of the video for the TV. Without one the TV shows a generated pattern. */
  tvVideo?: string;
}

/**
 * Gives the screen meshes live textures (analysis section 6).
 *
 * Each screen with content gets a `MeshBasicMaterial({ map })`, and the
 * content is ticked every frame. A screen without content keeps the dark
 * material its room source gave it: that is the CRT, which only shows something while
 * `CRTMode` runs its boot sequence (`set('screenCRT', …)`, then `clear`).
 */
export default class Screens {
  private meshes: Record<ScreenName, THREE.Mesh>;
  private contents = new Map<ScreenName, ScreenContent>();

  constructor(meshes: Record<ScreenName, THREE.Mesh>, options: ScreensOptions = {}) {
    this.meshes = meshes;

    this.create('screenWhiteboard', () => new Whiteboard());
    this.create('screenMacbook', () => new MacScreen());
    this.create('screenTV', () =>
      options.tvVideo
        ? new VideoScreen(options.tvVideo, () => {
            console.warn(`[room] ${options.tvVideo} could not be played; the TV shows the placeholder pattern.`);
            this.create('screenTV', () => new TestPattern());
          })
        : new TestPattern(),
    );
  }

  /** A screen whose content cannot be built (no 2D canvas, say) just stays as it was. */
  private create(name: ScreenName, build: () => ScreenContent): void {
    try {
      this.set(name, build());
    } catch (error) {
      console.warn(`[room] ${name} has no content:`, error);
    }
  }

  get(name: ScreenName): ScreenContent | undefined {
    return this.contents.get(name);
  }

  /** Show `content` on a screen, disposing what was there before. */
  set(name: ScreenName, content: ScreenContent): void {
    this.contents.get(name)?.destroy();
    this.contents.set(name, content);

    const mesh = this.meshes[name];
    (mesh.material as THREE.Material).dispose();
    // Not tone mapped: a screen shows its canvas colours as drawn.
    mesh.material = new THREE.MeshBasicMaterial({ map: content.texture, toneMapped: false });
  }

  /** Switch a screen off: drop its content and leave a flat dark material. */
  clear(name: ScreenName, color: THREE.ColorRepresentation = SCREEN_OFF): void {
    this.contents.get(name)?.destroy();
    this.contents.delete(name);

    const mesh = this.meshes[name];
    (mesh.material as THREE.Material).dispose();
    mesh.material = new THREE.MeshBasicMaterial({ color });
  }

  update(deltaMs: number): void {
    for (const content of this.contents.values()) content.update(deltaMs);
  }

  destroy(): void {
    for (const content of this.contents.values()) content.destroy();
    this.contents.clear();
  }
}
