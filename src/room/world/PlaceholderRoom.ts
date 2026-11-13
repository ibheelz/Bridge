import * as THREE from 'three';
import type { ModelName, RoomSource, ScreenName } from '../assets';

/**
 * A box-and-cylinder stand-in for the real room, built in code.
 *
 * It returns the same RoomSource shape as `createLoadedRoom()` (LoadedRoom.ts), so
 * swapping in real models is a data change. Dimensions follow analysis
 * section 3.1: footprint about 9.4 x 9.4, about 5.7 tall, floor at y = 0.32,
 * walls on the -x and -z sides. All layout numbers below are original
 * guesses at that scale, not measurements of anyone's model.
 */

type V3 = readonly [number, number, number];

export const FLOOR_Y = 0.32;
const HALF = 4.7; // half the footprint
const WALL_TOP = FLOOR_Y + 5.7;
const WALL_THICKNESS = 0.25;
const DESK_TOP = 2.3;
const TABLE_TOP = 1.17;
const SOFA_SEAT = 1.3;

/** World replaces this with clay (or a baked material) before anything renders. */
const blank = new THREE.MeshBasicMaterial({ color: '#cccccc' });

/** Axis-aligned box from its min and max corners, in world space. */
function box(min: V3, max: V3): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
    blank,
  );
  mesh.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return mesh;
}

/** Upright cylinder from the centre of its base, in world space. */
function cylinder(base: V3, radius: number, height: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), blank);
  mesh.position.set(base[0], base[1] + height / 2, base[2]);
  return mesh;
}

/**
 * Wrap world-space meshes the way a loaded GLB looks: a group at the origin
 * holding one node placed at the pivot, with the meshes under it.
 */
function model(name: ModelName, pivot: V3, meshes: THREE.Mesh[]): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const node = new THREE.Group();
  node.name = name;
  node.position.set(pivot[0], pivot[1], pivot[2]);
  for (const mesh of meshes) {
    mesh.position.sub(node.position);
    node.add(mesh);
  }
  group.add(node);
  return group;
}

/**
 * A flat screen quad with its transform baked into the vertices (world space,
 * identity transform, like screens.glb). UVs run 0-1 with v = 0 at the top,
 * which is what canvas textures with flipY = false expect.
 */
function screen(
  name: ScreenName,
  width: number,
  height: number,
  center: V3,
  rotation: V3,
  color: string,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(...center),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
  mesh.name = name;
  return mesh;
}

const SCREEN_OFF = '#15161a';

export function createPlaceholderRoom(): RoomSource {
  const F = FLOOR_Y;

  // --- Shell: floor slab and the two walls -------------------------------
  const roomModel = model('roomModel', [0, F, 0], [
    box([-HALF - WALL_THICKNESS, F - 0.25, -HALF - WALL_THICKNESS], [HALF, F, HALF]),
    box([-HALF - WALL_THICKNESS, F, -HALF - WALL_THICKNESS], [-HALF, WALL_TOP, HALF]),
    box([-HALF, F, -HALF - WALL_THICKNESS], [HALF, WALL_TOP, -HALF]),
  ]);

  // --- Desk along the -x wall --------------------------------------------
  const chairX = -1.45;
  const chairZ = -0.05;
  const workStation = model('workStation', [-3.55, F, 1.15], [
    box([-HALF, DESK_TOP - 0.15, -2.0], [-2.4, DESK_TOP, 4.3]), // top
    box([-HALF, F, -2.0], [-2.5, DESK_TOP - 0.15, -1.0]), // drawers, far end
    box([-HALF, F, 3.3], [-2.5, DESK_TOP - 0.15, 4.3]), // drawers, near end
    box([-4.3, DESK_TOP, 2.5], [-3.0, DESK_TOP + 1.25, 3.1]), // tower
    box([-2.95, DESK_TOP, -0.55], [-2.55, DESK_TOP + 0.05, 0.6]), // keyboard
    cylinder([-2.77, DESK_TOP, -1.37], 0.12, 0.26), // mug
    cylinder([-3.9, DESK_TOP, 3.75], 0.22, 0.35), // plant pot
    cylinder([-3.9, DESK_TOP + 0.35, 3.75], 0.07, 0.7), // plant stem
    // Chair base: the part that does not swivel.
    cylinder([chairX, F, chairZ], 0.5, 0.08),
    cylinder([chairX, F + 0.08, chairZ], 0.08, 1.12 - F - 0.08),
  ]);

  // --- CRT on the desk ----------------------------------------------------
  const retro = model('retro', [-3.45, DESK_TOP, 0.025], [
    box([-3.9, DESK_TOP, -0.45], [-3.1, DESK_TOP + 0.25, 0.5]), // foot
    box([-4.25, DESK_TOP + 0.25, -0.78], [-2.96, DESK_TOP + 1.55, 0.83]), // body
  ]);

  // --- Chair top, pivot on the swivel axis --------------------------------
  const chairTop = model('chairTop', [chairX, 1.12, chairZ], [
    box([chairX - 0.55, 1.12, chairZ - 0.55], [chairX + 0.55, 1.3, chairZ + 0.55]), // seat
    box([chairX + 0.43, 1.3, chairZ - 0.5], [chairX + 0.55, 2.6, chairZ + 0.5]), // back
  ]);

  // --- Living area: TV on the -z wall, table, sofa facing it ---------------
  const tv = { x0: 0.39, x1: 4.05, y0: 2.49, y1: 4.86 };
  const livingRoom = model('livingRoom', [2.3, F, -0.8], [
    box([0.4, F, -2.4], [4.2, F + 0.03, 1.6]), // rug
    box([0.5, F, -HALF], [3.95, 1.3, -3.9]), // console under the TV
    box([tv.x0 - 0.1, tv.y0 - 0.1, -HALF], [tv.x1 + 0.1, tv.y1 + 0.1, -4.56]), // TV body
    box([0.8, 1.3, -4.5], [1.5, 1.38, -4.05]), // books on the console
    box([0.85, 1.38, -4.48], [1.45, 1.46, -4.08]),
    box([1.3, TABLE_TOP - 0.1, -1.35], [3.8, TABLE_TOP, -0.15]), // table top
    box([1.4, F, -1.25], [1.52, TABLE_TOP - 0.1, -0.25]), // table sides
    box([3.58, F, -1.25], [3.7, TABLE_TOP - 0.1, -0.25]),
    box([0.8, F, 1.9], [3.9, SOFA_SEAT, 3.1]), // sofa seat
    box([0.8, F, 3.1], [3.9, SOFA_SEAT + 0.9, 3.45]), // sofa back
    box([0.55, F, 1.9], [0.8, SOFA_SEAT + 0.4, 3.45]), // sofa arms
    box([3.9, F, 1.9], [4.15, SOFA_SEAT + 0.4, 3.45]),
  ]);

  // --- Wall decor ---------------------------------------------------------
  const wallDecor = model('wallDecor', [-3.4, 3.6, -HALF], [
    box([-4.3, 2.8, -HALF], [-2.5, 4.4, -HALF + 0.06]), // pegboard, -z wall
    box([-HALF, 4.2, 1.6], [-HALF + 0.04, 5.3, 3.1]), // poster, -x wall
    box([-HALF, 4.4, -1.6], [-HALF + 0.04, 5.2, -0.6]), // poster, -x wall
  ]);

  // --- Laptop on the table, screen facing the sofa (+z) -------------------
  const mac = { x: 2.09, z: -0.75, width: 0.96, depth: 0.66, tilt: 0.28 };
  const hinge = new THREE.Vector3(mac.x, TABLE_TOP + 0.04, mac.z - mac.depth / 2);
  const lidRotation: V3 = [-mac.tilt, 0, 0];
  const lidPoint = (up: number, out: number): V3 => {
    const p = new THREE.Vector3(0, up, out).applyEuler(new THREE.Euler(...lidRotation)).add(hinge);
    return [p.x, p.y, p.z];
  };
  const lid = new THREE.Mesh(new THREE.BoxGeometry(mac.width, 0.68, 0.03), blank);
  lid.position.set(...lidPoint(0.34, 0));
  lid.rotation.set(...lidRotation);
  const macbook = model('macbook', [mac.x, TABLE_TOP, mac.z], [
    box(
      [mac.x - mac.width / 2, TABLE_TOP, mac.z - mac.depth / 2],
      [mac.x + mac.width / 2, TABLE_TOP + 0.04, mac.z + mac.depth / 2],
    ),
    lid,
  ]);

  // --- Door on the -z wall, pivot on the hinge ----------------------------
  const door = { hingeX: -2.11, width: 1.3, top: 3.9, z: -4.62, thickness: 0.08 };
  const doorModel = model('door', [door.hingeX, F, door.z], [
    box(
      [door.hingeX, F, door.z - door.thickness / 2],
      [door.hingeX + door.width, door.top, door.z + door.thickness / 2],
    ),
  ]);

  // --- Small props --------------------------------------------------------
  const roomba = model('roomba', [-1.81, F, 4.03], [cylinder([-1.81, F, 4.03], 0.45, 0.18)]);
  const book = model('book', [3.3, TABLE_TOP, -0.56], [
    box([3.05, TABLE_TOP, -0.74], [3.55, TABLE_TOP + 0.08, -0.38]),
  ]);
  const remote = model('remote', [3.25, SOFA_SEAT, 2.6], [
    box([3.19, SOFA_SEAT, 2.4], [3.31, SOFA_SEAT + 0.05, 2.8]),
  ]);

  // --- Screens (world space) ----------------------------------------------
  const doorFront = door.z + door.thickness / 2 + 0.01;
  const screens: Record<ScreenName, THREE.Mesh> = {
    // Faces +x. 1.21 x 0.91, about 4:3.
    screenCRT: screen('screenCRT', 1.21, 0.91, [-2.94, 3.145, 0.025], [0, Math.PI / 2, 0], SCREEN_OFF),
    // Faces +z, on the -z wall.
    screenTV: screen(
      'screenTV',
      tv.x1 - tv.x0,
      tv.y1 - tv.y0,
      [(tv.x0 + tv.x1) / 2, (tv.y0 + tv.y1) / 2, -4.55],
      [0, 0, 0],
      SCREEN_OFF,
    ),
    // On the laptop lid, tilted with it.
    screenMacbook: screen('screenMacbook', 0.9, 0.62, lidPoint(0.34, 0.017), lidRotation, SCREEN_OFF),
    // On the door; World re-parents it to the door so it swings with it.
    screenWhiteboard: screen(
      'screenWhiteboard',
      0.9,
      1.51,
      [door.hingeX + door.width / 2, 2.75, doorFront],
      [0, 0, 0],
      '#f7f6f2',
    ),
  };

  return {
    models: {
      roomModel,
      workStation,
      livingRoom,
      wallDecor,
      retro,
      macbook,
      door: doorModel,
      chairTop,
      roomba,
      book,
      remote,
    },
    screens,
    textures: {},
  };
}
