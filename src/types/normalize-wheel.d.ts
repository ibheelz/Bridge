declare module 'normalize-wheel' {
  export interface NormalizedWheel {
    spinX: number;
    spinY: number;
    pixelX: number;
    pixelY: number;
  }
  export default function normalizeWheel(event: WheelEvent): NormalizedWheel;
}
