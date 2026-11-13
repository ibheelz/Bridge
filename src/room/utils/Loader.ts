import * as THREE from 'three';
import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import EventEmitter from './EventEmitter';
import type { Source } from '../assets';

export type LoadedFile = GLTF | THREE.Texture;

/** The extension decides the loader; the regex tolerates a `?v=` query. */
const EXTENSION = /\.([a-z0-9]+)(?:\?.*)?$/i;

/**
 * Loads files by extension (analysis section 4.5): glb/gltf through GLTFLoader
 * with Draco, jpg/png/webp as textures.
 *
 * Events: `fileEnd (source, data)`, `fileError (source, error)`, and `end`
 * once everything handed to `load()` has settled either way.
 *
 * The GLTF and Draco loaders are imported on first use, so a page that falls
 * back to the placeholder room never downloads them.
 */
export default class Loader extends EventEmitter {
  toLoad = 0;
  loaded = 0;

  private dracoPath: string;
  private gltfLoader: Promise<GLTFLoader> | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private textureLoader: THREE.TextureLoader | null = null;
  private destroyed = false;

  /** `dracoPath` is the folder holding the decoder files, with a trailing slash. */
  constructor(dracoPath: string) {
    super();
    this.dracoPath = dracoPath;
  }

  load(sources: readonly Source[]): void {
    this.toLoad += sources.length;

    for (const source of sources) {
      const extension = source.path.match(EXTENSION)?.[1]?.toLowerCase() ?? '';
      this.loadFile(source, extension).then(
        (data) => this.settle('fileEnd', source, data),
        (error) => this.settle('fileError', source, error),
      );
    }
  }

  private async loadFile(source: Source, extension: string): Promise<LoadedFile> {
    switch (extension) {
      case 'glb':
      case 'gltf':
        return (await this.getGltfLoader()).loadAsync(source.path);
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        this.textureLoader ??= new THREE.TextureLoader();
        return this.textureLoader.loadAsync(source.path);
      default:
        throw new Error(`No loader for "${source.path}"`);
    }
  }

  private getGltfLoader(): Promise<GLTFLoader> {
    this.gltfLoader ??= Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]).then(([gltf, draco]) => {
      this.dracoLoader = new draco.DRACOLoader();
      this.dracoLoader.setDecoderPath(this.dracoPath);
      if (this.destroyed) this.dracoLoader.dispose();
      const loader = new gltf.GLTFLoader();
      loader.setDRACOLoader(this.dracoLoader);
      return loader;
    });
    return this.gltfLoader;
  }

  private settle(event: 'fileEnd' | 'fileError', source: Source, payload: unknown): void {
    if (this.destroyed) return;
    this.loaded++;
    this.trigger(event, source, payload);
    if (this.loaded === this.toLoad) this.trigger('end');
  }

  /** Stops events and frees the Draco workers. Files already in flight are dropped. */
  destroy(): void {
    this.destroyed = true;
    this.dracoLoader?.dispose();
    this.clear();
  }
}
