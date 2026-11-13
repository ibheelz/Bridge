import * as THREE from 'three';
import { prefersReducedMotion } from '../utils/motion';

/**
 * 2D classic Perlin noise, from "webgl-noise" by Stefan Gustavson and Ian
 * McEwan (MIT licence, https://github.com/stegu/webgl-noise).
 */
const NOISE = /* glsl */ `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 *
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}
`;

// UV convention: v = 0 at the mug, v = 1 at the free end.
const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uTimeFrequency;
varying vec2 vUv;
${NOISE}
void main() {
  vec3 newPosition = position;
  vec2 dispUv = uv * vec2(0.5, 0.7);
  dispUv.y -= uTime * uTimeFrequency * 0.5;
  float disp = cnoise(dispUv * 3.0);
  float strength = pow(uv.y, 2.0); // pinned at the mug, sways more higher up
  newPosition.x += disp * 0.12 * strength;
  newPosition.z += disp * 0.08 * strength;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uTimeFrequency;
uniform vec2 uUvFrequency;
uniform vec3 uColor;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 uv = vUv * uUvFrequency;
  uv.y -= uTime * uTimeFrequency;
  float noise = clamp(cnoise(uv), 0.0, 1.0);
  noise *= min(min(vUv.x * 4.0, (1.0 - vUv.x) * 4.0), 1.0); // side fade
  noise *= pow(vUv.y, 0.5);                                 // fade toward the mug
  noise *= (1.0 - vUv.y) * 1.2;                             // dissolve at the free end
  gl_FragColor = vec4(uColor, noise * 0.8);
}
`;

/** Animated steam ribbon over the mug (analysis section 5). */
export default class CoffeeSteam {
  private material: THREE.ShaderMaterial;

  /** `mesh` is a subdivided plane with 0-1 UVs, v = 0 at the mug. */
  constructor(mesh: THREE.Mesh) {
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uTimeFrequency: { value: 0.0004 },
        uUvFrequency: { value: new THREE.Vector2(5, 4) },
        uColor: { value: new THREE.Color('#f5efe6') },
      },
    });
    mesh.material = this.material;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // The shader moves vertices, so the static bounding sphere is not reliable.
    mesh.frustumCulled = false;
  }

  /** Frozen where it is with reduced motion. */
  update(elapsedMs: number): void {
    if (prefersReducedMotion()) return;
    this.material.uniforms.uTime.value = elapsedMs;
  }
}
