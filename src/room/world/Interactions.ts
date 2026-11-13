import * as THREE from 'three';
import type Camera from '../Camera';
import { HOME_VIEW } from '../Camera';
import { EVENTS, emit, type HoverDetail } from '../events';
import type Navigation from '../Navigation';
import { getScreenGeo } from '../utils/screenGeo';
import type World from './World';

/** A press that travels less than this between down and up is a click (section 7). */
const CLICK_MAX_TRAVEL = 6;
/** Computer hit box: padding and depth, as fractions of the CRT screen's largest side. */
const HULL_PADDING = 0.16;
const HULL_DEPTH = 0.9;

export type TargetId = 'door' | 'macbook' | 'tv' | 'computer';

/**
 * Hover and click on the room's objects (analysis section 7).
 *
 * Only the targets below are raycast; the nearest one under the pointer wins.
 * The door swallows clicks, the laptop and TV fire their events, and the
 * computer (a box around the CRT, built from `screenCRT`) fires
 * `kai:computer-activate`. This class owns the cursor on the target element.
 */
export default class Interactions {
  /** Cinematic modes turn this off while they run. */
  enabled = true;
  hovered: TargetId | null = null;

  private camera: Camera;
  private navigation: Navigation;
  private element: HTMLElement;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private hitPoint = new THREE.Vector3();
  private meshes: THREE.Mesh[] = [];
  private ids = new Map<THREE.Object3D, TargetId>();
  private hull: THREE.Box3;
  private press: { id: number; x: number; y: number } | null = null;

  constructor(camera: Camera, navigation: Navigation, element: HTMLElement, world: World) {
    this.camera = camera;
    this.navigation = navigation;
    this.element = element;

    const add = (id: TargetId, root: THREE.Object3D): void => {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || this.ids.has(child)) return;
        this.ids.set(child, id);
        this.meshes.push(child);
      });
    };
    for (const mesh of world.door.meshes) add('door', mesh);
    add('macbook', world.screens.screenMacbook);
    add('macbook', world.models.macbook);
    add('tv', world.screens.screenTV);
    add('tv', world.models.remote);

    const crt = getScreenGeo(world.screens.screenCRT, HOME_VIEW.target);
    const side = Math.max(crt.size.x, crt.size.y, crt.size.z);
    this.hull = crt.box.clone().expandByScalar(side * HULL_PADDING);
    this.hull.union(this.hull.clone().translate(crt.normal.clone().multiplyScalar(-side * HULL_DEPTH)));

    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerCancel);
    element.addEventListener('pointerleave', this.onPointerLeave);
  }

  destroy(): void {
    const el = this.element;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerCancel);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.setHover(null);
  }

  private get active(): boolean {
    return this.enabled && !this.navigation.suspended;
  }

  /** The nearest target under a client-space point, or null. */
  private pick(clientX: number, clientY: number): TargetId | null {
    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera.instance);

    let id: TargetId | null = null;
    let distance = Infinity;
    const hit = this.raycaster.intersectObjects(this.meshes, false)[0];
    if (hit) {
      id = this.ids.get(hit.object) ?? null;
      distance = hit.distance;
    }
    const ray = this.raycaster.ray;
    if (ray.intersectBox(this.hull, this.hitPoint) && ray.origin.distanceTo(this.hitPoint) < distance) {
      id = 'computer';
    }
    return id;
  }

  private setHover(id: TargetId | null): void {
    if (id === this.hovered) return;
    const was = this.hovered;
    this.hovered = id;
    // The door takes clicks only to swallow them, so it does not look clickable.
    this.element.style.cursor = id && id !== 'door' ? 'pointer' : '';
    if (was === 'computer' || id === 'computer') {
      const detail: HoverDetail = { id: 'computer', hovered: id === 'computer' };
      emit(EVENTS.hover, detail);
    }
  }

  private click(id: TargetId | null): void {
    if (id === 'macbook') emit(EVENTS.macbookActivate);
    else if (id === 'tv') emit(EVENTS.tvToggle);
    else if (id === 'computer') emit(EVENTS.computerActivate);
    // 'door' and null: nothing.
  }

  private onPointerDown = (e: PointerEvent): void => {
    // A second finger, or any button but the main one, makes it a gesture, not a click.
    if (this.press || !e.isPrimary || e.button !== 0) {
      this.press = null;
      return;
    }
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return; // no hover on touch
    if (!this.active) return this.setHover(null);
    if (e.buttons !== 0) return; // drag in progress: keep the hover as it was
    this.setHover(this.pick(e.clientX, e.clientY));
  };

  private onPointerUp = (e: PointerEvent): void => {
    const press = this.press;
    if (!press || press.id !== e.pointerId) return;
    this.press = null;
    if (!this.active) return;

    const id = this.pick(e.clientX, e.clientY);
    if (e.pointerType !== 'touch') this.setHover(id);
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < CLICK_MAX_TRAVEL) this.click(id);
  };

  private onPointerCancel = (): void => {
    this.press = null;
  };

  private onPointerLeave = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') this.setHover(null);
  };
}
