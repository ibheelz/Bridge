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

/**
 * What World needs to build the room, whoever supplies it.
 *
 * Each model is shaped like a loaded GLB scene: a group at the origin holding
 * ONE child node whose transform is the object's pivot (door hinge, chair
 * swivel axis, roomba centre). Screens are meshes in world space with 0-1 UVs
 * and V flipped the glTF way (canvas textures use flipY = false).
 *
 * `baked` is false when no baked texture exists for the models, in which case
 * World applies the clay material and adds the fallback lights.
 */
export interface RoomSource {
  models: Record<ModelName, THREE.Group>;
  screens: Record<ScreenName, THREE.Mesh>;
  baked: boolean;
}
