import * as THREE from 'three';

/**
 * What the windows show: the sky outside for the visitor, right now.
 *
 * The sun's height is worked out from the visitor's clock and an estimate of
 * where they are: longitude from their time zone's standard offset, latitude
 * a fixed guess. If the visitor has already allowed this site to use their
 * location, the real position is used instead. The site never asks for it.
 * `?time=HH:MM` in the URL pretends it is that local time today (for checking).
 */

/** Canvas size; the glass is square, and a gradient needs few pixels. */
const SIZE = 128;
/** How often the sun's height is recomputed. */
const CHECK_MS = 30_000;
/** Latitude used when the real one is unknown (degrees north). */
const DEFAULT_LATITUDE = 30;
const STAR_COUNT = 26;

/** Sky colours at given sun elevations (degrees): top of the window, bottom of the window. */
const KEYS: { elevation: number; top: string; bottom: string }[] = [
  { elevation: -18, top: '#070b1c', bottom: '#121a36' }, // night
  { elevation: -8, top: '#111836', bottom: '#2a2f5c' }, // late dusk
  { elevation: -3, top: '#2f3770', bottom: '#c8706a' }, // dusk / dawn glow
  { elevation: 2, top: '#5f86c4', bottom: '#f3b37c' }, // sunrise / sunset
  { elevation: 10, top: '#79b2e8', bottom: '#cfe8fb' }, // day
  { elevation: 40, top: '#6aa9e6', bottom: '#d9eefc' }, // high sun
];

const RAD = Math.PI / 180;

/** Sun elevation in degrees (NOAA's simplified equations). `longitude` is east-positive. */
export function sunElevation(date: Date, latitude: number, longitude: number): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000) + 1;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const trueSolarMinutes = hours * 60 + eqTime + 4 * longitude;
  const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;
  const lat = latitude * RAD;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(THREE.MathUtils.clamp(cosZenith, -1, 1)) / RAD;
}

/** Longitude implied by the time zone's standard (non-daylight-saving) offset. */
function longitudeFromTimeZone(now: Date): number {
  const year = now.getFullYear();
  // getTimezoneOffset is UTC minus local, in minutes; the larger of January and July is standard time.
  const standard = Math.max(new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset());
  return -standard / 4;
}

/** `?time=HH:MM` → that local time today; otherwise null. */
function timeOverride(): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(window.location.search).get('time') ?? '');
  if (!match) return null;
  const date = new Date();
  date.setHours(Math.min(23, Number(match[1])), Math.min(59, Number(match[2])), 0, 0);
  return date;
}

function mix(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/** Interpolated top/bottom colours, and how visible the stars are (0-1). */
function skyAt(elevation: number): { top: string; bottom: string; stars: number } {
  let top = KEYS[0].top;
  let bottom = KEYS[0].bottom;
  if (elevation >= KEYS[KEYS.length - 1].elevation) {
    top = KEYS[KEYS.length - 1].top;
    bottom = KEYS[KEYS.length - 1].bottom;
  } else {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const a = KEYS[i];
      const b = KEYS[i + 1];
      if (elevation < a.elevation || elevation > b.elevation) continue;
      const t = (elevation - a.elevation) / (b.elevation - a.elevation);
      top = mix(a.top, b.top, t);
      bottom = mix(a.bottom, b.bottom, t);
      break;
    }
  }
  const stars = THREE.MathUtils.clamp((-6 - elevation) / 6, 0, 1);
  return { top, bottom, stars };
}

export default class WindowSky {
  /** Shared by every window pane; unlit, since it is light coming in from outside. */
  material: THREE.MeshBasicMaterial;
  /** Last computed sun elevation, in degrees. */
  elevation = 0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private texture: THREE.CanvasTexture;
  private latitude = DEFAULT_LATITUDE;
  private longitude: number | null = null;
  private sinceCheck = Infinity;
  private drawn = '';
  /** Fixed star positions (0-1), so the stars do not jump between redraws. */
  private starField = Array.from({ length: STAR_COUNT }, (_, i) => {
    const r = (n: number): number => {
      const x = Math.sin((i + 1) * n) * 43758.5453;
      return x - Math.floor(x);
    };
    return { x: r(12.9898), y: r(78.233) * 0.75, size: 0.6 + r(39.425) * 0.9 };
  });

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false });
    this.useKnownLocation();
    this.update(0);
  }

  /** Real coordinates only if permission was already granted; never prompts. */
  private useKnownLocation(): void {
    const permissions = navigator.permissions;
    if (!permissions?.query || !navigator.geolocation) return;
    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.latitude = position.coords.latitude;
            this.longitude = position.coords.longitude;
            this.sinceCheck = Infinity; // redraw with the real place
          },
          () => {},
          { maximumAge: 3_600_000, timeout: 10_000 },
        );
      })
      .catch(() => {});
  }

  update(deltaMs: number): void {
    this.sinceCheck += deltaMs;
    if (this.sinceCheck < CHECK_MS) return;
    this.sinceCheck = 0;

    const now = timeOverride() ?? new Date();
    const longitude = this.longitude ?? longitudeFromTimeZone(now);
    this.elevation = sunElevation(now, this.latitude, longitude);
    this.draw(skyAt(this.elevation));
  }

  private draw(sky: { top: string; bottom: string; stars: number }): void {
    const ctx = this.ctx;
    const key = `${sky.top}${sky.bottom}${sky.stars.toFixed(2)}`;
    if (!ctx || key === this.drawn) return;
    this.drawn = key;

    const gradient = ctx.createLinearGradient(0, 0, 0, SIZE);
    gradient.addColorStop(0, sky.top);
    gradient.addColorStop(1, sky.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (sky.stars > 0) {
      ctx.fillStyle = `rgba(255, 252, 240, ${0.85 * sky.stars})`;
      for (const star of this.starField) {
        ctx.beginPath();
        ctx.arc(star.x * SIZE, star.y * SIZE, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.texture.needsUpdate = true;
  }

  destroy(): void {
    this.texture.dispose();
    this.material.dispose();
  }
}
