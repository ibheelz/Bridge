import type * as THREE from 'three';

/** Model names, in build order (analysis sections 3.1 and 4.6). */
export const MODEL_NAMES = [
  'roomModel',
  'workStation',
  'livingRoom',
  'wallDecor',
  'retro',
  'macbook',
  'door',
  'chairTop',
  'roomba',
  'book',
  'remote',
] as const;
export type ModelName = (typeof MODEL_NAMES)[number];

/** Screen mesh names: the contract between the modelling tool and the code. */
export const SCREEN_NAMES = ['screenCRT', 'screenTV', 'screenMacbook', 'screenWhiteboard'] as const;
export type ScreenName = (typeof SCREEN_NAMES)[number];

/** Waypoints for the roomba, fetched at runtime (shape in analysis section 3.3). */
export const ROOMBA_PATH_FILE = 'assets/roomba-path.json';

/**
 * What World needs to build the room, whoever supplies it.
 *
 * Each model is shaped like a loaded GLB scene: a group at the origin holding
 * ONE child node whose transform is the object's pivot (door hinge, chair
 * swivel axis, roomba centre). Screens are meshes in world space with 0-1 UVs
 * and V flipped the glTF way (canvas textures use flipY = false).
 *
 * `textures` holds the baked texture of each model that has one. A model
 * without an entry gets the clay material, and World adds the fallback lights
 * as soon as one model needs them.
 */
export interface RoomSource {
  models: Record<ModelName, THREE.Group>;
  screens: Record<ScreenName, THREE.Mesh>;
  textures: Partial<Record<ModelName, THREE.Texture>>;
  /**
   * Optional steam ribbon over the mug: a subdivided plane in world space with
   * 0-1 UVs, v = 0 at the mug. World gives it the steam shader.
   */
  steam?: THREE.Mesh;
  /**
   * How far the door's pivot turns about y when it opens, in radians, sign
   * included. Defaults to +25 degrees (Door.ts). Set it when that would swing
   * the door through the wall.
   */
  doorOpenAngle?: number;
}

/** One file for the loader. `name` is the key it ends up under in `resources.items`. */
export interface Source {
  name: string;
  path: string;
}

export interface SourceGroup {
  name: string;
  items: Source[];
}

/** GLBs that are loaded when present but that the room can be built without. */
const OPTIONAL_MODELS = ['coffeeSteam'] as const;

/** File name without directory, cache-bust query or extension. */
function stem(url: string): { base: string; ext: string } {
  const file = url.split('?')[0].split('/').pop() ?? '';
  const dot = file.lastIndexOf('.');
  return dot < 0 ? { base: file, ext: '' } : { base: file.slice(0, dot), ext: file.slice(dot + 1).toLowerCase() };
}

/**
 * Turn the list of files found in `public/assets/` at build time into the
 * `base` group (section 4.5: GLBs first, then baked textures).
 *
 * Naming: `<model>.glb` loads under `<model>`, `screens.glb` under `screens`,
 * `baked-<model>.jpg` (or .png/.webp) under `baked_<model>`.
 *
 * Returns an empty group unless every model GLB and `screens.glb` is there:
 * a half-supplied room would have holes, so the placeholder is used instead
 * and nothing is downloaded.
 */
export function createBaseGroup(urls: readonly string[]): SourceGroup {
  const glbs = new Map<string, string>();
  const bakes = new Map<string, string>();

  for (const url of urls) {
    const { base, ext } = stem(url);
    if (ext === 'glb' || ext === 'gltf') glbs.set(base, url);
    else if (/^(jpe?g|png|webp)$/.test(ext) && base.startsWith('baked-')) bakes.set(base.slice(6), url);
  }

  const group: SourceGroup = { name: 'base', items: [] };
  const required = [...MODEL_NAMES, 'screens'];
  const missing = required.filter((name) => !glbs.has(name));
  if (missing.length > 0) {
    if (missing.length < required.length) {
      console.warn(`[room] public/assets is missing ${missing.join(', ')}.glb; using the placeholder room.`);
    }
    return group;
  }

  for (const name of [...required, ...OPTIONAL_MODELS]) {
    const path = glbs.get(name);
    if (path) group.items.push({ name, path });
  }
  for (const name of MODEL_NAMES) {
    const path = bakes.get(name);
    if (path) group.items.push({ name: `baked_${name}`, path });
  }
  return group;
}
