import * as THREE from 'three';
import type { ModelName, RoomScreens, RoomSource, ScreenName } from '../assets';

/**
 * A box-and-cylinder stand-in for the real room, built in code.
 *
 * It returns the same RoomSource shape as `createLoadedRoom()` (LoadedRoom.ts), so
 * swapping in real models is a data change. Floor at y = 0.32 (analysis
 * section 3.1). Wider and taller than the reference: 14 x 9.4, walls 8 tall
 * (room for a chandelier; the reference is 5.7), with walls on
 * the left (-x), back (-z) and right (+x), seen straight on from the open +z
 * side. The left desk and computer are mirrored on the right wall; the TV sits
 * in the middle of the back wall with the sofa, table and laptop in front of
 * it. All layout numbers are original guesses, not measurements of anyone's model.
 */

type V3 = readonly [number, number, number];

export const FLOOR_Y = 0.32;
const HALF_X = 7; // half the width (left to right)
const HALF_Z = 4.7; // half the depth (back to front)
const WALL_TOP = FLOOR_Y + 8;
const WALL_THICKNESS = 0.25;
const DESK_TOP = 2.3;
const TABLE_TOP = 1.17;
const SOFA_SEAT = 1.3;
/** Desks: how far from the side wall the chair stands, and its z. */
const CHAIR_IN = 3.25;
const CHAIR_Z = -0.05;
const MUG: V3 = [-5.07, DESK_TOP, -1.37]; // centre of the mug's base, on the left desk
const MUG_HEIGHT = 0.26;
const SHOW_WHITEBOARD = false;
/**
 * The building: this room is one unit in a row of identical ones (a hotel
 * floor). The neighbours are closed blocks; a corridor with a railing runs
 * along the front of all of them, level with the room's floor.
 */
const UNIT_WIDTH = 2 * (HALF_X + WALL_THICKNESS); // 14.5, centre to centre
const UNITS_EACH_SIDE = 2;
const BUILDING_HALF_X = HALF_X + WALL_THICKNESS + UNITS_EACH_SIDE * UNIT_WIDTH;
const CORRIDOR = { depth: 3.7, railHeight: 1.1, postEvery: 2.0 } as const;
const NEIGHBOUR_DOOR = { width: 1.5, height: 3.1 } as const;
/** Floor to floor (slab underside to wall top), and how many floors are below this one (10th floor). */
const STOREY = WALL_TOP - (FLOOR_Y - 0.25);
const FLOORS_BELOW = 9;
/** The ground and sea outside, at the foot of the building. */
const GROUND_LEVEL = FLOOR_Y - 0.25 - FLOORS_BELOW * STOREY;
/** The TV on the back wall: centred, 4.4 wide (screen x and y extents). */
const TV = { x0: -2.2, x1: 2.2, y0: 2.49, y1: 4.86 } as const;
/**
 * Windows: square openings cut through the back wall, vertically centred on
 * the TV, with about 1.1 of plain wall between each window frame and the TV.
 * `WINDOW_CENTER_X` is the left one; the right one mirrors it.
 */
const WINDOW = { width: 2.2, height: 2.2, frame: 0.12, depth: 0.1 } as const;
const WINDOW_CENTER_X = -4.75;
const WINDOW_SILL = (TV.y0 + TV.y1) / 2 - WINDOW.height / 2;

/** World replaces this with clay (or a baked material) before anything renders. */
const blank = new THREE.MeshBasicMaterial({ color: '#cccccc' });

/**
 * Placeholder colours, one per kind of object, so the pieces read apart.
 * World turns `userData.clayColor` into a clay material of that colour.
 */
const COLORS = {
  floor: '#b8916a',
  wall: '#ece7de',
  deskTop: '#8a5a3b',
  drawers: '#a87b55',
  tower: '#3a3e45',
  keyboard: '#2c2f34',
  pot: '#c4643f',
  plant: '#5a9152',
  chairBase: '#2a2a2c',
  chairSeat: '#3f5f8f',
  crt: '#d9d0ba',
  crtFoot: '#bdb299',
  mug: '#f6f3ec',
  rug: '#9fb0c8',
  console: '#6a4a33',
  tv: '#1c1e22',
  bookA: '#c9503e',
  bookB: '#3f8290',
  table: '#d4b48a',
  tableLegs: '#9c7b5e',
  sofa: '#6b8b72',
  sofaArms: '#56735d',
  laptop: '#a8adb4',
  windowFrame: '#f4f1ea',
  building: '#e2dbcf',
  seam: '#cfc6b8',
  corridor: '#8c5a4f',
  neighbourDoor: '#7b5236',
  railing: '#3a3d42',
  roomba: '#30343a',
  book: '#d34b5c',
  remote: '#232326',
} as const;

/** Marks a mesh as window glass; World gives it the faint glass material. */
function glass(mesh: THREE.Mesh): THREE.Mesh {
  mesh.userData.windowGlass = true;
  return mesh;
}

function paint<T extends THREE.Mesh>(mesh: T, color?: string): T {
  if (color) mesh.userData.clayColor = color;
  return mesh;
}

/** Axis-aligned box from its min and max corners, in world space. */
function box(min: V3, max: V3, color?: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
    blank,
  );
  mesh.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return paint(mesh, color);
}

/** Upright cylinder from the centre of its base, in world space. */
function cylinder(base: V3, radius: number, height: number, color?: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), blank);
  mesh.position.set(base[0], base[1] + height / 2, base[2]);
  return paint(mesh, color);
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

/**
 * A window in its opening in the back wall: frame lining the opening through
 * the wall's thickness, a cross bar, and faint glass. The outdoor scene
 * (Outdoors.ts) shows through it.
 */
function windowOnBackWall(cx: number): THREE.Mesh[] {
  const { width, height, frame, depth } = WINDOW;
  const sill = WINDOW_SILL;
  const z0 = -HALF_Z - WALL_THICKNESS;
  const x0 = cx - width / 2;
  const x1 = cx + width / 2;
  const y1 = sill + height;
  const ym = sill + height / 2;
  const z1 = -HALF_Z + depth; // frame stands a little proud of the inside face
  const zm = -HALF_Z - WALL_THICKNESS / 2;
  return [
    glass(box([x0, sill, zm - 0.01], [x1, y1, zm + 0.01])),
    box([x0 - frame, sill - frame, z0], [x1 + frame, sill, z1], COLORS.windowFrame), // sill
    box([x0 - frame, y1, z0], [x1 + frame, y1 + frame, z1], COLORS.windowFrame), // head
    box([x0 - frame, sill, z0], [x0, y1, z1], COLORS.windowFrame), // jambs
    box([x1, sill, z0], [x1 + frame, y1, z1], COLORS.windowFrame),
    box([cx - frame / 3, sill, zm - 0.03], [cx + frame / 3, y1, zm + 0.03], COLORS.windowFrame), // mullion
    box([x0, ym - frame / 3, zm - 0.03], [x1, ym + frame / 3, zm + 0.03], COLORS.windowFrame), // transom
  ];
}

/** The back wall in pieces, leaving the two window openings (frame included) open. */
function backWall(F: number): THREE.Mesh[] {
  const z: [number, number] = [-HALF_Z - WALL_THICKNESS, -HALF_Z];
  const half = WINDOW.width / 2 + WINDOW.frame;
  const inner = Math.abs(WINDOW_CENTER_X) - half; // opening edges, x > 0
  const outer = Math.abs(WINDOW_CENTER_X) + half;
  const bottom = WINDOW_SILL - WINDOW.frame;
  const top = WINDOW_SILL + WINDOW.height + WINDOW.frame;
  const piece = (x0: number, x1: number, y0: number, y1: number): THREE.Mesh =>
    box([x0, y0, z[0]], [x1, y1, z[1]], COLORS.wall);
  return [
    piece(-HALF_X, -outer, F, WALL_TOP), // left of the left window
    piece(-inner, inner, F, WALL_TOP), // middle, behind the TV
    piece(outer, HALF_X, F, WALL_TOP), // right of the right window
    piece(-outer, -inner, F, bottom), // under and over each window
    piece(-outer, -inner, top, WALL_TOP),
    piece(inner, outer, F, bottom),
    piece(inner, outer, top, WALL_TOP),
  ];
}

/**
 * The rest of the floor: closed neighbouring units either side (solid blocks
 * with a door each onto the corridor, and a seam between units), and the
 * corridor along the front of the whole row, with a railing at its edge.
 */
function building(F: number): THREE.Mesh[] {
  const back = -HALF_Z - WALL_THICKNESS;
  const front = HALF_Z;
  const inner = HALF_X + WALL_THICKNESS;
  const meshes: THREE.Mesh[] = [];

  for (const sign of [-1, 1]) {
    const x0 = sign * inner;
    const x1 = sign * BUILDING_HALF_X;
    meshes.push(box([Math.min(x0, x1), F - 0.25, back], [Math.max(x0, x1), WALL_TOP, front], COLORS.building));
    for (let i = 0; i <= UNITS_EACH_SIDE; i++) {
      // Seam at each unit boundary (including the edges of this room), down the whole facade.
      const seamX = sign * (inner + i * UNIT_WIDTH);
      meshes.push(box([seamX - 0.1, GROUND_LEVEL, front], [seamX + 0.1, WALL_TOP, front + 0.06], COLORS.seam));
      if (i === UNITS_EACH_SIDE) continue;
      const doorX = sign * (inner + (i + 0.5) * UNIT_WIDTH);
      meshes.push(
        box(
          [doorX - NEIGHBOUR_DOOR.width / 2, F, front],
          [doorX + NEIGHBOUR_DOOR.width / 2, F + NEIGHBOUR_DOOR.height, front + 0.05],
          COLORS.neighbourDoor,
        ),
      );
    }
  }

  // Corridor floor along the whole row, level with the room's floor.
  const edge = front + CORRIDOR.depth;
  meshes.push(box([-BUILDING_HALF_X, F - 0.25, front], [BUILDING_HALF_X, F, edge], COLORS.corridor));
  // Railing: posts and a hand rail at the corridor's open edge.
  const railZ = edge - 0.1;
  const top = F + CORRIDOR.railHeight;
  for (let x = -BUILDING_HALF_X + 0.1; x <= BUILDING_HALF_X; x += CORRIDOR.postEvery) {
    meshes.push(box([x - 0.04, F, railZ - 0.04], [x + 0.04, top, railZ + 0.04], COLORS.railing));
  }
  meshes.push(box([-BUILDING_HALF_X, top - 0.06, railZ - 0.06], [BUILDING_HALF_X, top, railZ + 0.06], COLORS.railing));

  // The nine floors below: one solid block, with each floor's corridor slab,
  // a solid parapet (cheaper than posts at this distance) and a door per unit.
  meshes.push(box([-BUILDING_HALF_X, GROUND_LEVEL, back], [BUILDING_HALF_X, F - 0.25, front], COLORS.building));
  for (let k = 1; k <= FLOORS_BELOW; k++) {
    const level = F - k * STOREY;
    meshes.push(box([-BUILDING_HALF_X, level - 0.25, front], [BUILDING_HALF_X, level, edge], COLORS.corridor));
    meshes.push(box([-BUILDING_HALF_X, level, edge - 0.15], [BUILDING_HALF_X, level + CORRIDOR.railHeight, edge], COLORS.railing));
    for (let u = -UNITS_EACH_SIDE; u <= UNITS_EACH_SIDE; u++) {
      const doorX = u * UNIT_WIDTH;
      meshes.push(
        box(
          [doorX - NEIGHBOUR_DOOR.width / 2, level, front],
          [doorX + NEIGHBOUR_DOOR.width / 2, level + NEIGHBOUR_DOOR.height, front + 0.05],
          COLORS.neighbourDoor,
        ),
      );
    }
  }
  return meshes;
}

type Side = 'left' | 'right';

/** Box given in left-desk coordinates, mirrored across x = 0 for the right desk. */
function sideBox(side: Side, min: V3, max: V3, color?: string): THREE.Mesh {
  if (side === 'left') return box(min, max, color);
  return box([-max[0], min[1], min[2]], [-min[0], max[1], max[2]], color);
}

function sideX(side: Side, x: number): number {
  return side === 'left' ? x : -x;
}

/**
 * One desk against a side wall: top, drawers, tower, keyboard, plant, the
 * fixed chair base, the CRT, and the chair seat. Coordinates are for the left
 * wall; the right desk is the mirror image.
 */
function desk(side: Side, F: number) {
  const W = -HALF_X; // the side wall, in left coordinates
  const chairX = sideX(side, W + CHAIR_IN);
  const workStation = [
    sideBox(side, [W, DESK_TOP - 0.15, -2.0], [W + 2.3, DESK_TOP, 4.3], COLORS.deskTop), // top
    sideBox(side, [W, F, -2.0], [W + 2.2, DESK_TOP - 0.15, -1.0], COLORS.drawers), // drawers, far end
    sideBox(side, [W, F, 3.3], [W + 2.2, DESK_TOP - 0.15, 4.3], COLORS.drawers), // drawers, near end
    sideBox(side, [W + 0.4, DESK_TOP, 2.5], [W + 1.7, DESK_TOP + 1.25, 3.1], COLORS.tower), // tower
    sideBox(side, [W + 1.75, DESK_TOP, -0.55], [W + 2.15, DESK_TOP + 0.05, 0.6], COLORS.keyboard), // keyboard
    cylinder([sideX(side, W + 0.8), DESK_TOP, 3.75], 0.22, 0.35, COLORS.pot), // plant pot
    cylinder([sideX(side, W + 0.8), DESK_TOP + 0.35, 3.75], 0.07, 0.7, COLORS.plant), // plant stem
    // Chair base: the part that does not swivel.
    cylinder([chairX, F, CHAIR_Z], 0.5, 0.08, COLORS.chairBase),
    cylinder([chairX, F + 0.08, CHAIR_Z], 0.08, 1.12 - F - 0.08, COLORS.chairBase),
  ];
  const retro = [
    sideBox(side, [W + 0.8, DESK_TOP, -0.45], [W + 1.6, DESK_TOP + 0.25, 0.5], COLORS.crtFoot), // foot
    sideBox(side, [W + 0.45, DESK_TOP + 0.25, -0.78], [W + 1.74, DESK_TOP + 1.55, 0.83], COLORS.crt), // body
  ];
  // Seat and back; the back is on the side away from the desk.
  const seat = new THREE.Group();
  seat.name = `chairTop_${side}`;
  seat.position.set(chairX, 1.12, CHAIR_Z);
  const seatMeshes = [
    sideBox(side, [W + CHAIR_IN - 0.55, 1.12, CHAIR_Z - 0.55], [W + CHAIR_IN + 0.55, 1.3, CHAIR_Z + 0.55], COLORS.chairSeat),
    sideBox(side, [W + CHAIR_IN + 0.43, 1.3, CHAIR_Z - 0.5], [W + CHAIR_IN + 0.55, 2.6, CHAIR_Z + 0.5], COLORS.chairSeat),
  ];
  for (const mesh of seatMeshes) {
    mesh.position.sub(seat.position);
    seat.add(mesh);
  }
  // Facing into the room: +x for the left desk, -x for the right.
  const screenCenter: V3 = [sideX(side, W + 1.76), 3.145, 0.025];
  const screenRotation: V3 = [0, side === 'left' ? Math.PI / 2 : -Math.PI / 2, 0];
  return { workStation, retro, seat, screenCenter, screenRotation };
}

export function createPlaceholderRoom(): RoomSource {
  const F = FLOOR_Y;
  const left = desk('left', F);
  const right = desk('right', F);

  // --- Shell: floor slab and the three walls -------------------------------
  const roomModel = model('roomModel', [0, F, 0], [
    box([-HALF_X - WALL_THICKNESS, F - 0.25, -HALF_Z - WALL_THICKNESS], [HALF_X + WALL_THICKNESS, F, HALF_Z], COLORS.floor),
    box([-HALF_X - WALL_THICKNESS, F, -HALF_Z - WALL_THICKNESS], [-HALF_X, WALL_TOP, HALF_Z], COLORS.wall), // left
    ...backWall(F),
    box([HALF_X, F, -HALF_Z - WALL_THICKNESS], [HALF_X + WALL_THICKNESS, WALL_TOP, HALF_Z], COLORS.wall), // right
    ...building(F),
  ]);

  // --- Desks along the side walls; the mug is on the left one only --------
  const workStation = model('workStation', [-HALF_X + 1.15, F, 1.15], [
    ...left.workStation,
    ...right.workStation,
    cylinder(MUG, 0.12, MUG_HEIGHT, COLORS.mug),
  ]);
  const retro = model('retro', [-HALF_X + 1.25, DESK_TOP, 0.025], [...left.retro, ...right.retro]);

  // --- Chair seats: one swivel node each (ChairTop turns every child) -----
  const chairTop = new THREE.Group();
  chairTop.name = 'chairTop';
  chairTop.add(left.seat, right.seat);

  // --- Living area: TV centred on the back wall, table, sofa facing it -----
  const tv = TV;
  const livingRoom = model('livingRoom', [0, F, -0.8], [
    box([-1.9, F, -2.4], [1.9, F + 0.03, 1.6], COLORS.rug), // rug
    box([-2.1, F, -HALF_Z], [2.1, 1.3, -3.9], COLORS.console), // console under the TV
    box([tv.x0 - 0.1, tv.y0 - 0.1, -HALF_Z], [tv.x1 + 0.1, tv.y1 + 0.1, -4.56], COLORS.tv), // TV body
    box([-1.42, 1.3, -4.5], [-0.72, 1.38, -4.05], COLORS.bookA), // books on the console
    box([-1.37, 1.38, -4.48], [-0.77, 1.46, -4.08], COLORS.bookB),
    box([-1.25, TABLE_TOP - 0.1, -1.35], [1.25, TABLE_TOP, -0.15], COLORS.table), // table top
    box([-1.15, F, -1.25], [-1.03, TABLE_TOP - 0.1, -0.25], COLORS.tableLegs), // table sides
    box([1.03, F, -1.25], [1.15, TABLE_TOP - 0.1, -0.25], COLORS.tableLegs),
    box([-1.55, F, 1.9], [1.55, SOFA_SEAT, 3.1], COLORS.sofa), // sofa seat
    box([-1.55, F, 3.1], [1.55, SOFA_SEAT + 0.9, 3.45], COLORS.sofa), // sofa back
    box([-1.8, F, 1.9], [-1.55, SOFA_SEAT + 0.4, 3.45], COLORS.sofaArms), // sofa arms
    box([1.55, F, 1.9], [1.8, SOFA_SEAT + 0.4, 3.45], COLORS.sofaArms),
  ]);


  // --- Laptop on the table, screen facing the sofa (+z) -------------------
  const mac = { x: -0.13, z: -0.75, width: 0.96, depth: 0.66, tilt: 0.28 };
  const hinge = new THREE.Vector3(mac.x, TABLE_TOP + 0.04, mac.z - mac.depth / 2);
  const lidRotation: V3 = [-mac.tilt, 0, 0];
  const lidPoint = (up: number, out: number): V3 => {
    const p = new THREE.Vector3(0, up, out).applyEuler(new THREE.Euler(...lidRotation)).add(hinge);
    return [p.x, p.y, p.z];
  };
  const lid = paint(new THREE.Mesh(new THREE.BoxGeometry(mac.width, 0.68, 0.03), blank), COLORS.laptop);
  lid.position.set(...lidPoint(0.34, 0));
  lid.rotation.set(...lidRotation);
  const macbook = model('macbook', [mac.x, TABLE_TOP, mac.z], [
    box(
      [mac.x - mac.width / 2, TABLE_TOP, mac.z - mac.depth / 2],
      [mac.x + mac.width / 2, TABLE_TOP + 0.04, mac.z + mac.depth / 2],
      COLORS.laptop,
    ),
    lid,
  ]);

  // --- No door (user request): the door model is an empty hinge node -----
  // `door` is a required model, so it stays as a pivot with nothing on it; the
  // (hidden) whiteboard screen hangs from it.
  const door = { hingeX: -4.4, width: 1.3, z: -4.62, thickness: 0.08 };
  const doorModel = model('door', [door.hingeX, F, door.z], []);

  // --- Windows on the back wall, either side of the TV ----------------------
  const windows = [WINDOW_CENTER_X, -WINDOW_CENTER_X].flatMap((x) => windowOnBackWall(x));

  // --- Wall decor: just the windows now ------------------------------------
  const wallDecor = model('wallDecor', [WINDOW_CENTER_X, WINDOW_SILL + WINDOW.height / 2, -HALF_Z], windows);

  // --- Small props --------------------------------------------------------
  const roomba = model('roomba', [-3, F, 4.1], [cylinder([-3, F, 4.1], 0.45, 0.18, COLORS.roomba)]);
  const book = model('book', [1.08, TABLE_TOP, -0.56], [
    box([0.83, TABLE_TOP, -0.74], [1.33, TABLE_TOP + 0.08, -0.38], COLORS.book),
  ]);
  const remote = model('remote', [1.03, SOFA_SEAT, 2.6], [
    box([0.97, SOFA_SEAT, 2.4], [1.09, SOFA_SEAT + 0.05, 2.8], COLORS.remote),
  ]);

  // --- Screens (world space) ----------------------------------------------
  const doorFront = door.z + door.thickness / 2 + 0.01;
  const screens: RoomScreens = {
    // 1.21 x 0.91, about 4:3. Left faces +x, right faces -x.
    screenCRT: screen('screenCRT', 1.21, 0.91, left.screenCenter, left.screenRotation, SCREEN_OFF),
    screenCRT2: screen('screenCRT2', 1.21, 0.91, right.screenCenter, right.screenRotation, SCREEN_OFF),
    // Faces +z, on the back wall.
    screenTV: screen(
      'screenTV',
      tv.x1 - tv.x0,
      tv.y1 - tv.y0,
      [(tv.x0 + tv.x1) / 2, (tv.y0 + tv.y1) / 2, -4.55],
      [0, 0, 0],
      SCREEN_OFF,
    ),
    // On the laptop lid, tilted with it.
    screenMacbook: screen('screenMacbook', 0.9, 0.59, lidPoint(0.34, 0.017), lidRotation, SCREEN_OFF),
    // On the door; World re-parents it to the door so it swings with it.
    screenWhiteboard: screen(
      'screenWhiteboard',
      0.9,
      1.39,
      [door.hingeX + door.width / 2, 2.75, doorFront],
      [0, 0, 0],
      '#f7f6f2',
    ),
  };

  // The whiteboard on the door is hidden for now (user request). The mesh stays
  // because the code expects every required screen; set this to true to bring it back.
  screens.screenWhiteboard.visible = SHOW_WHITEBOARD;

  // --- Steam over the mug: 0.28 x 0.5, facing the open front (the camera) ---
  const steamGeometry = new THREE.PlaneGeometry(0.28, 0.5, 16, 32);
  steamGeometry.translate(0, 0.25, 0); // v = 0 sits on the mug rim
  const steam = new THREE.Mesh(steamGeometry, blank);
  steam.name = 'coffeeSteam';
  steam.position.set(MUG[0], MUG[1] + MUG_HEIGHT, MUG[2]);
  steam.rotation.y = 0;

  return {
    steam,
    // No door leaf now; kept so a door can come back with the same hinge.
    doorOpenAngle: THREE.MathUtils.degToRad(-25),
    groundY: GROUND_LEVEL,
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
