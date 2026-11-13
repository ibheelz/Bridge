import * as THREE from 'three';
import { prepareScreenTexture, type ScreenContent } from './CanvasScreen';

/**
 * A looping muted video as a screen (analysis section 6.3).
 *
 * Browsers may refuse autoplay, so `play()` is retried when the video can
 * play, on the first pointer/touch, and when the tab becomes visible again.
 * `video` is public so the audio step can un-mute it and route it later.
 */
export default class VideoScreen implements ScreenContent {
  readonly video: HTMLVideoElement;
  readonly texture: THREE.VideoTexture;

  private onError: () => void;

  constructor(src: string, onError: () => void) {
    this.onError = onError;

    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    this.video = video;
    this.texture = prepareScreenTexture(new THREE.VideoTexture(video));

    video.addEventListener('canplay', this.play);
    video.addEventListener('error', this.onError);
    window.addEventListener('pointerdown', this.play);
    window.addEventListener('touchend', this.play);
    document.addEventListener('visibilitychange', this.onVisibility);

    video.src = src;
    this.play();
  }

  private play = (): void => {
    if (!this.video.paused) return;
    this.video.play().catch(() => {
      // Autoplay refused; one of the retries above will get it going.
    });
  };

  private onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.play();
  };

  update(): void {
    // VideoTexture uploads new frames by itself.
  }

  destroy(): void {
    const video = this.video;
    video.removeEventListener('canplay', this.play);
    video.removeEventListener('error', this.onError);
    window.removeEventListener('pointerdown', this.play);
    window.removeEventListener('touchend', this.play);
    document.removeEventListener('visibilitychange', this.onVisibility);
    video.pause();
    video.removeAttribute('src');
    video.load();
    this.texture.dispose();
  }
}
