import * as THREE from 'three';
import { EVENTS, emit, type SkyDetail } from '../events';
import {
  DEFAULT_LATITUDE,
  knownLocation,
  longitudeFromTimeZone,
  sunElevation,
  timeOverride,
} from '../utils/sun';

/**
 * The world outside the room: a sky dome over a grass island at sea level,
 * with the sea running out to the horizon. It is real geometry, so the view
 * through the windows (and past the walls) moves with the camera. Every colour
 * follows the sun's height for the visitor (see `utils/sun.ts`): blue by day,
 * warm at sunrise and sunset, dark with stars at night. The page behind the
 * canvas gets the same sky through `kai:sky`, so nothing pale is left around the room.
 */

/** How often the sun's height is recomputed. */
const CHECK_MS = 30_000;
const SKY_RADIUS = 95; // inside the camera's far plane (150) from any allowed camera position
const GROUND_Y = 0.05; // sea level, just under the room's floor slab
/**
 * The island: grass out to about this radius from the room's centre, with a
 * wavy shoreline and a thin strip of sand. From the home view the windows
 * look down onto the ground 14-28 units behind the room, so they show the
 * shore and the sea.
 */
const ISLAND_RADIUS = 18;
const SAND_WIDTH = 0.9;
/** The sea blends into the horizon colour between these distances. */
const HORIZON_FADE = { from: 30, to: 88 } as const;
const NIGHT_BELOW = -4; // sun elevation (degrees) under which the page counts as night

type Palette = { top: string; horizon: string; grass: string; sand: string; sea: string };

/** Colours at given sun elevations (degrees), blended between neighbours. */
const KEYS: { elevation: number; colors: Palette }[] = [
  { elevation: -14, colors: { top: '#060a1a', horizon: '#18203f', grass: '#0a120e', sand: '#1a1c24', sea: '#08102a' } }, // night
  { elevation: -4, colors: { top: '#2b336b', horizon: '#c26f6a', grass: '#2f3a30', sand: '#5a4f55', sea: '#2a2f5a' } }, // dusk / dawn
  { elevation: 1, colors: { top: '#5d84c2', horizon: '#f2b07a', grass: '#6f8350', sand: '#c9a982', sea: '#5a6fa0' } }, // sunrise / sunset
  { elevation: 10, colors: { top: '#6aa9e6', horizon: '#d6ecfb', grass: '#7cad57', sand: '#e2d3a8', sea: '#3d8cc2' } }, // day
];

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform float uStars;
uniform float uDim;
varying vec3 vDir;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 color = mix(uHorizon, uTop, pow(h, 0.55));

  // Sparse fixed stars, only above the horizon.
  vec3 p = dir * 150.0;
  vec3 cell = floor(p);
  float star = step(0.9968, hash(cell)) * smoothstep(0.42, 0.0, length(fract(p) - 0.5));
  color += uStars * star * smoothstep(0.03, 0.2, dir.y) * 0.9;

  gl_FragColor = vec4(color * uDim, 1.0);
  #include <colorspace_fragment>
}
`;

const GROUND_VERTEX = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const GROUND_FRAGMENT = /* glsl */ `
uniform vec3 uGrass;
uniform vec3 uSand;
uniform vec3 uSea;
uniform vec3 uHorizon;
uniform float uDim;
uniform float uIsland;
uniform float uSand_;
uniform vec2 uFade;
varying vec2 vXZ;
void main() {
  float r = length(vXZ);
  float a = atan(vXZ.y, vXZ.x);
  // A wavy, fixed shoreline.
  float shore = uIsland + 1.6 * sin(a * 3.0 + 1.0) + 1.1 * sin(a * 7.0 + 2.0) + 0.6 * sin(a * 13.0);
  float edge = fwidth(r) + 0.04;
  vec3 color = mix(uGrass, uSand, smoothstep(shore - edge, shore + edge, r));
  color = mix(color, uSea, smoothstep(shore + uSand_ - edge, shore + uSand_ + edge, r));
  color = mix(color, uHorizon, smoothstep(uFade.x, uFade.y, r));
  gl_FragColor = vec4(color * uDim, 1.0);
  #include <colorspace_fragment>
}
`;

function mixHex(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

function paletteAt(elevation: number): Palette {
  const first = KEYS[0];
  const last = KEYS[KEYS.length - 1];
  if (elevation <= first.elevation) return first.colors;
  if (elevation >= last.elevation) return last.colors;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (elevation > b.elevation) continue;
    const t = (elevation - a.elevation) / (b.elevation - a.elevation);
    const out = {} as Palette;
    for (const key of Object.keys(a.colors) as (keyof Palette)[]) out[key] = mixHex(a.colors[key], b.colors[key], t);
    return out;
  }
  return last.colors;
}

export default class Outdoors {
  group = new THREE.Group();
  /** Last computed sun elevation, in degrees. */
  elevation = 0;
  /** Faint glass for the window openings. */
  glass = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, depthWrite: false });

  private sky: THREE.ShaderMaterial;
  private ground: THREE.ShaderMaterial;
  private geometries: THREE.BufferGeometry[] = [];

  private latitude = DEFAULT_LATITUDE;
  private longitude: number | null = null;
  private sinceCheck = Infinity;
  private applied = '';

  constructor() {
    this.group.name = 'outdoors';

    this.sky = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uStars: { value: 0 },
        uDim: { value: 1 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const domeGeometry = new THREE.SphereGeometry(SKY_RADIUS, 48, 24);
    this.geometries.push(domeGeometry);
    const dome = new THREE.Mesh(domeGeometry, this.sky);
    dome.renderOrder = -1;
    dome.frustumCulled = false;

    this.ground = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      uniforms: {
        uGrass: { value: new THREE.Color() },
        uSand: { value: new THREE.Color() },
        uSea: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uDim: { value: 1 },
        uIsland: { value: ISLAND_RADIUS },
        uSand_: { value: SAND_WIDTH },
        uFade: { value: new THREE.Vector2(HORIZON_FADE.from, HORIZON_FADE.to) },
      },
    });
    const groundGeometry = new THREE.CircleGeometry(SKY_RADIUS - 2, 96);
    this.geometries.push(groundGeometry);
    const ground = new THREE.Mesh(groundGeometry, this.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;

    this.group.add(dome, ground);

    knownLocation((latitude, longitude) => {
      this.latitude = latitude;
      this.longitude = longitude;
      this.sinceCheck = Infinity; // recompute with the real place
    });
    this.update(0);
  }

  update(deltaMs: number): void {
    this.sinceCheck += deltaMs;
    if (this.sinceCheck < CHECK_MS) return;
    this.sinceCheck = 0;

    const now = timeOverride() ?? new Date();
    const longitude = this.longitude ?? longitudeFromTimeZone(now);
    this.elevation = sunElevation(now, this.latitude, longitude);
    this.apply(paletteAt(this.elevation), THREE.MathUtils.clamp((-4 - this.elevation) / 8, 0, 1));
  }

  private apply(colors: Palette, stars: number): void {
    const key = `${Object.values(colors).join('')}${stars.toFixed(2)}`;
    if (key === this.applied) return;
    this.applied = key;

    (this.sky.uniforms.uTop.value as THREE.Color).set(colors.top);
    (this.sky.uniforms.uHorizon.value as THREE.Color).set(colors.horizon);
    this.sky.uniforms.uStars.value = stars;
    (this.ground.uniforms.uGrass.value as THREE.Color).set(colors.grass);
    (this.ground.uniforms.uSand.value as THREE.Color).set(colors.sand);
    (this.ground.uniforms.uSea.value as THREE.Color).set(colors.sea);
    (this.ground.uniforms.uHorizon.value as THREE.Color).set(colors.horizon);

    const detail: SkyDetail = { top: colors.top, horizon: colors.horizon, night: this.elevation < NIGHT_BELOW };
    emit(EVENTS.sky, detail);
  }

  destroy(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of [this.sky, this.ground, this.glass]) material.dispose();
  }
}
