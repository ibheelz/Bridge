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

    this.resize();
  }

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
    if (this.post) this.post.render();
    else this.instance.render(this.scene, this.camera.instance);
  }

  destroy(): void {
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
