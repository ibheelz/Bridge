import * as THREE from 'three';
import type Experience from '../room/Experience';
import { HOME_VIEW, fovForAspect } from '../room/Camera';
import { EVENTS, emit, type RoomRectDetail } from '../room/events';

/**
 * Reports where the room sits on screen at the home view (analysis section 10,
 * `kai:room-rect`), so the edge labels can be centred in the empty margins.
 * A private camera placed at the home view is used rather than the live one,
 * so the labels stay put while the user orbits. Re-sent on every resize.
 */
export function initRoomRect(experience: Experience): () => void {
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 150);
  camera.rotation.reorder('YXZ');
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  let measured = false;
  let offResize: (() => void) | null = null;

  const measure = (): void => {
    const world = experience.world;
    if (!world) return;
    if (!measured) {
      box.makeEmpty();
      for (const group of Object.values(world.models)) {
        group.updateWorldMatrix(true, true);
        box.expandByObject(group);
      }
      measured = true;
    }
    if (box.isEmpty()) return;

    const { width, height, aspect } = experience.sizes;
    camera.aspect = aspect;
    camera.fov = fovForAspect(aspect);
    camera.updateProjectionMatrix();
    camera.position
      .setFromSphericalCoords(HOME_VIEW.radius, HOME_VIEW.phi, HOME_VIEW.theta)
      .add(HOME_VIEW.target);
    camera.lookAt(HOME_VIEW.target);
    camera.updateMatrixWorld();

    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner
        .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
        .project(camera);
      const x = ((corner.x + 1) / 2) * width;
      const y = ((1 - corner.y) / 2) * height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const detail: RoomRectDetail = { left, right, top, bottom, viewportWidth: width, viewportHeight: height };
    emit(EVENTS.roomRect, detail);
  };

  // The world is built a little after page load; wait for it, measure once, then follow resizes.
  const offTick = experience.time.on('tick', () => {
    if (!experience.world) return;
    offTick();
    measure();
    offResize = experience.sizes.on('resize', measure);
  });

  return () => {
    offTick();
    offResize?.();
  };
}
