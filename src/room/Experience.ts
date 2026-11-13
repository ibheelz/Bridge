import * as THREE from 'three';
import Time from './utils/Time';
import Sizes from './utils/Sizes';
import Camera from './Camera';
import Renderer from './Renderer';
import Navigation from './Navigation';
import World from './world/World';
import { createPlaceholderRoom } from './world/PlaceholderRoom';

export interface ExperienceOptions {
  targetElement: HTMLElement;
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
  world!: World;
  navigation!: Navigation;

  constructor(options?: ExperienceOptions) {
    if (Experience.instance) return Experience.instance;
    if (!options?.targetElement) throw new Error('Experience needs a targetElement');
    Experience.instance = this;
    window.experience = this;

    this.targetElement = options.targetElement;
    this.config = { debug: window.location.hash === '#debug' };

    this.time = new Time();
    this.sizes = new Sizes(this.targetElement);
    this.scene = new THREE.Scene();
    this.camera = new Camera(this.sizes, this.scene);
    this.renderer = new Renderer(this.sizes, this.scene, this.camera, this.targetElement);
    // Step 3 swaps this for Resources, falling back to the placeholder.
    this.world = new World(this.scene, createPlaceholderRoom());
    this.navigation = new Navigation(this.camera, this.sizes, this.time, this.targetElement);

    this.sizes.on('resize', () => this.resize());
    this.time.on('tick', () => this.update());
  }

  private resize(): void {
    this.camera.resize();
    this.renderer.resize();
  }

  /** Frame order follows section 4.1; modes and audio slot in later. */
  private update(): void {
    this.camera.update();
    this.renderer.render();
    this.world.update();
    this.navigation.update();
  }

  destroy(): void {
    this.time.destroy();
    this.sizes.destroy();
    this.navigation.destroy();
    this.world.destroy();
    this.renderer.destroy();
    if (window.experience === this) delete window.experience;
    Experience.instance = null;
  }
}
