import * as THREE from 'three';
import { prefersReducedMotion } from '../utils/motion';

/**
 * Small lights that move: the design PC's RGB (colours chasing round the case
 * and through the fans) and the IT side's status LEDs (server and switch
 * lights blinking). A mesh asks for one with `userData.light`:
 *
 * - `{ kind: 'rgb', phase }`: hue cycles over time; `phase` (0-1) offsets it,
 *   so a row of segments with rising phases looks like light running along it.
 * - `{ kind: 'blink', seed, on, off? }`: flickers between `on` and `off`
 *   (dark by default) in an irregular rhythm, like network activity.
 * - `{ kind: 'steady', on }`: always on (power lights).
 *
 * Each light gets its own unlit material. With reduced motion the RGB holds
 * still and the LEDs stay on. `dim` (0-1) follows the room's lights-out.
 */
export type LightSpec =
  | { kind: 'rgb'; phase: number }
  | { kind: 'blink'; seed: number; on: string; off?: string }
  | { kind: 'steady'; on: string };

const RGB_CYCLE_S = 6; // one trip round the colour wheel
const BLINK_RATE = 7; // flicker steps per second
const BLINK_DUTY = 0.62; // share of steps a blinking LED is on
const LED_OFF = '#1a1d22';

interface Light {
  spec: LightSpec;
  material: THREE.MeshBasicMaterial;
  on: THREE.Color;
  off: THREE.Color;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default class DeskLights {
  /** 1 = normal, 0 = dark (CRT lights-out). */
  dim = 1;

  private lights: Light[] = [];
  private color = new THREE.Color();

  constructor(meshes: THREE.Mesh[]) {
    for (const mesh of meshes) {
      const spec = mesh.userData.light as LightSpec;
      const material = new THREE.MeshBasicMaterial({ toneMapped: false });
      mesh.material = material;
      const on = new THREE.Color(spec.kind === 'rgb' ? '#ffffff' : spec.on);
      const off = new THREE.Color(spec.kind === 'blink' ? (spec.off ?? LED_OFF) : '#000000');
      this.lights.push({ spec, material, on, off });
    }
    this.update(0);
  }

  update(elapsedMs: number): void {
    const still = prefersReducedMotion();
    const seconds = still ? 0 : elapsedMs / 1000;
    for (const light of this.lights) {
      const { spec, material } = light;
      if (spec.kind === 'rgb') {
        const hue = (((seconds / RGB_CYCLE_S + spec.phase) % 1) + 1) % 1;
        this.color.setHSL(hue, 1, 0.55);
      } else if (spec.kind === 'steady') {
        this.color.copy(light.on);
      } else {
        const lit = still || hash(Math.floor(seconds * BLINK_RATE) + spec.seed * 97.3) < BLINK_DUTY;
        this.color.copy(lit ? light.on : light.off);
      }
      material.color.copy(this.color).multiplyScalar(this.dim);
    }
  }

  destroy(): void {
    for (const light of this.lights) light.material.dispose();
    this.lights = [];
  }
}
