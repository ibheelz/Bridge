import * as THREE from 'three';
import Time from './utils/Time';
import Sizes from './utils/Sizes';
import Camera from './Camera';
import Renderer from './Renderer';
import Navigation from './Navigation';
import Resources from './utils/Resources';
import type { ResourceGroup } from './utils/Resources';
import World from './world/World';
import Interactions from './world/Interactions';
import { createBaseGroup } from './assets';
import { createLoadedRoom } from './world/LoadedRoom';
import { createPlaceholderRoom } from './world/PlaceholderRoom';

export interface ExperienceOptions {
  targetElement: HTMLElement;
  /** URLs of the files found in `public/assets/` at build time. Empty means placeholder room. */
  assets?: readonly string[];
  /** Folder holding the Draco decoder, with a trailing slash. */
  dracoPath?: string;
  /** URL of the video for the TV screen, when `public/assets/screens/` holds one. */
  tvVideo?: string;
}

declare global {
  interface Window {
    experience?: Experience;
  }
}

/**
 * Singleton that owns the scene and the frame loop (analysis section 4.1).
 * `new Experience()` returns the existing instance if there is one.
 */
export default class Experience {
  private static instance: Experience | null = null;

  targetElement!: HTMLElement;
  config!: { debug: boolean };
  time!: Time;
  sizes!: Sizes;
  scene!: THREE.Scene;
  camera!: Camera;
  renderer!: Renderer;
  resources!: Resources;
  /** Built when the `base` resource group ends, so it is missing for the first frames. */
  world: World | null = null;
  navigation!: Navigation;
  /** Hover and click on the room's objects; exists once `world` does. */
  interactions: Interactions | null = null;

  private tvVideo?: string;

  constructor(options?: ExperienceOptions) {
    if (Experience.instance) return Experience.instance;
    if (!options?.targetElement) throw new Error('Experience needs a targetElement');
    Experience.instance = this;
    window.experience = this;

    this.targetElement = options.targetElement;
    this.tvVideo = options.tvVideo;
    this.config = { debug: window.location.hash === '#debug' };

    this.time = new Time();
    this.sizes = new Sizes(this.targetElement);
    this.scene = new THREE.Scene();
    this.camera = new Camera(this.sizes, this.scene);
    this.renderer = new Renderer(this.sizes, this.scene, this.camera, this.targetElement);
    this.navigation = new Navigation(this.camera, this.sizes, this.time, this.targetElement);

    this.resources = new Resources([createBaseGroup(options.assets ?? [])], options.dracoPath ?? '/draco/');
    this.resources.on('groupEnd', (group: ResourceGroup) => {
      if (group.name === 'base') this.buildWorld(group);
    });

    this.sizes.on('resize', () => this.resize());
    this.time.on('tick', () => this.update());

    // Deferred by Resources, so callers can still attach listeners after `new Experience()`.
    this.resources.load();
  }

  /** Real models when they all loaded, the placeholder room otherwise. */
  private buildWorld(group: ResourceGroup): void {
    const loaded = group.toLoad > 0 ? createLoadedRoom(this.resources.items) : null;
    this.world = new World(this.scene, this.time, loaded ?? createPlaceholderRoom(), {
      tvVideo: this.tvVideo,
    });
    this.interactions = new Interactions(this.camera, this.navigation, this.targetElement, this.world);
  }

  private resize(): void {
    this.camera.resize();
    this.renderer.resize();
  }

  /** Frame order follows section 4.1; modes and audio slot in later. */
  private update(): void {
    this.camera.update();
    this.renderer.render();
    this.world?.update();
    this.navigation.update();
  }

  destroy(): void {
    this.time.destroy();
    this.sizes.destroy();
    this.resources.destroy();
    this.navigation.destroy();
    this.interactions?.destroy();
    this.interactions = null;
    this.world?.destroy();
    this.world = null;
    this.renderer.destroy();
    if (window.experience === this) delete window.experience;
    Experience.instance = null;
  }
}
