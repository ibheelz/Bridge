import * as THREE from 'three';
import type Sizes from './utils/Sizes';
import type Camera from './Camera';

/** Transparent canvas so the page gradient shows through. No tone mapping, no shadows. */
export default class Renderer {
  instance: THREE.WebGLRenderer;

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
  }

  render(): void {
    this.instance.render(this.scene, this.camera.instance);
  }

  destroy(): void {
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
