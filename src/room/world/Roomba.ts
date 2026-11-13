import * as THREE from 'three';

type Point = [number, number, number];

interface RoombaPath {
  /** Where the roomba model rests; the points are read relative to it. */
  origin: Point;
  points: Point[];
}

const TURN_SPEED = 1.8; // rad/s
const DRIVE_SPEED = 0.35; // units/s at full factor
const PAUSE_MS = 350;
const MAX_DELTA_MS = 100;

function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function parsePath(data: unknown): RoombaPath | null {
  if (typeof data !== 'object' || data === null) return null;
  const { origin, points } = data as { origin?: unknown; points?: unknown };
  if (!isPoint(origin) || !Array.isArray(points) || points.length < 2 || !points.every(isPoint)) return null;
  return { origin, points };
}

/**
 * Drives the roomba round a waypoint loop (analysis section 5): turn toward
 * the next point, drive to it easing in and out, pause, repeat. A small motor
 * vibration sits on top. It stays parked until the path file has loaded, and
 * for good if the file is missing or malformed.
 */
export default class Roomba {
  /** Motor level 0-1; the audio system reads this (step 10). */
  motor = 0;

  private pivot: THREE.Object3D;
  private rest: THREE.Vector3;
  private restRotation: THREE.Euler;

  private points: THREE.Vector3[] = [];
  private position: THREE.Vector3;
  private heading: number;
  private state: 'idle' | 'turn' | 'drive' | 'pause' = 'idle';
  private target = 0;
  private legStart = new THREE.Vector3();
  private legLength = 0;
  private travelled = 0;
  private pauseLeft = 0;
  private clock = 0; // seconds of roomba time, for the vibration
  private destroyed = false;

  /** `model` is the roomba group; its single child node is the roomba's centre. */
  constructor(model: THREE.Group, pathUrl: string) {
    this.pivot = model.children[0] ?? model;
    this.rest = this.pivot.position.clone();
    this.restRotation = this.pivot.rotation.clone();
    this.position = this.rest.clone();
    this.heading = this.restRotation.y;
    void this.load(pathUrl);
  }

  private async load(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const path = parsePath(await response.json());
      if (!path) throw new Error('expected { origin: [x,y,z], points: [[x,y,z], ...] }');
      if (this.destroyed) return;

      // Points are world positions of the model's origin; shift them onto the pivot node.
      const offset = this.rest.clone().sub(new THREE.Vector3(...path.origin));
      this.points = path.points.map((p) => new THREE.Vector3(...p).add(offset));
      this.target = 0;
      this.state = 'turn';
    } catch (error) {
      console.warn(`[room] roomba path ${url} not usable; the roomba stays parked.`, error);
    }
  }

  update(deltaMs: number): void {
    if (this.state === 'idle') return;
    const dt = Math.min(deltaMs, MAX_DELTA_MS) / 1000;
    this.clock += dt;

    if (this.state === 'turn') this.turn(dt);
    else if (this.state === 'drive') this.drive(dt);
    else this.pause(dt);

    // Vibration on top of the logical pose.
    const t = this.clock;
    const m = this.motor;
    this.pivot.position.copy(this.position);
    this.pivot.position.y += m * 0.0025 * (0.6 * Math.sin(81.7 * t) + 0.4 * Math.sin(54.6 * t + 1.7));
    this.pivot.rotation.set(
      this.restRotation.x + m * 0.006 * Math.sin(71 * t + 0.5),
      this.heading,
      this.restRotation.z + m * 0.006 * Math.sin(57.2 * t + 2.1),
    );
  }

  private turn(dt: number): void {
    const goal = this.points[this.target];
    const dx = goal.x - this.position.x;
    const dz = goal.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-3) {
      // Already there (the path starts where the roomba is parked).
      this.next();
      return;
    }

    this.motor = 0.5;
    const wanted = Math.atan2(-dx, -dz);
    // Shortest signed difference, in -PI..PI.
    const diff = Math.atan2(Math.sin(wanted - this.heading), Math.cos(wanted - this.heading));
    const step = TURN_SPEED * dt;
    if (Math.abs(diff) > step) {
      this.heading += Math.sign(diff) * step;
      return;
    }

    this.heading = wanted;
    this.legStart.copy(this.position);
    this.legLength = distance;
    this.travelled = 0;
    this.state = 'drive';
  }

  private drive(dt: number): void {
    const remaining = this.legLength - this.travelled;
    const factor = Math.max(Math.min(Math.sqrt(this.travelled / 0.35), Math.sqrt(remaining / 0.6)), 0.18);
    this.motor = Math.min(factor, 1);
    this.travelled += DRIVE_SPEED * factor * dt;

    const goal = this.points[this.target];
    if (this.travelled >= this.legLength) {
      this.position.x = goal.x;
      this.position.z = goal.z;
      this.pauseLeft = PAUSE_MS / 1000;
      this.state = 'pause';
      return;
    }
    const k = this.travelled / this.legLength;
    this.position.x = this.legStart.x + (goal.x - this.legStart.x) * k;
    this.position.z = this.legStart.z + (goal.z - this.legStart.z) * k;
  }

  private pause(dt: number): void {
    this.motor = 0.15;
    this.pauseLeft -= dt;
    if (this.pauseLeft <= 0) this.next();
  }

  private next(): void {
    this.target = (this.target + 1) % this.points.length;
    this.state = 'turn';
  }

  destroy(): void {
    this.destroyed = true;
    this.state = 'idle';
    this.motor = 0;
  }
}
