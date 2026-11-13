import * as THREE from 'three';
import {
  MODEL_NAMES,
  OPTIONAL_SCREEN_NAMES,
  SCREEN_NAMES,
  type ModelName,
  type RoomScreens,
  type RoomSource,
} from '../assets';
import type { LoadedFile } from '../utils/Loader';

/** Screens are dark until `Screens` gives them content (the CRT stays dark until it boots). */
const SCREEN_OFF = '#15161a';

/**
 * Build a RoomSource from what Resources loaded, or return null when a model
 * or a screen mesh is missing (the caller then uses the placeholder room).
 *
 * Expects the files described in analysis section 3.1: one GLB per model with
 * its world transform on the node, and `screens.glb` holding the meshes named
 * in SCREEN_NAMES. Baked textures are optional per model.
 */
export function createLoadedRoom(items: Record<string, LoadedFile>): RoomSource | null {
  const scenes = {} as Record<ModelName, THREE.Group>;
  for (const name of MODEL_NAMES) {
    const file = items[name];
    if (!file || file instanceof THREE.Texture) return missing(`${name}.glb`);
    file.scene.name ||= name;
    scenes[name] = file.scene;
  }

  const screensFile = items.screens;
  if (!screensFile || screensFile instanceof THREE.Texture) return missing('screens.glb');
  screensFile.scene.updateMatrixWorld(true);

  const screens = {} as RoomScreens;
  for (const name of SCREEN_NAMES) {
    const mesh = screensFile.scene.getObjectByName(name);
    if (!(mesh instanceof THREE.Mesh)) return missing(`mesh "${name}" in screens.glb`);
    screens[name] = mesh;
  }
  for (const name of OPTIONAL_SCREEN_NAMES) {
    const mesh = screensFile.scene.getObjectByName(name);
    if (mesh instanceof THREE.Mesh) screens[name] = mesh;
  }
  for (const mesh of Object.values(screens)) {
    if (!mesh) continue;
    // Keep the world transform when World re-parents the mesh.
    mesh.removeFromParent();
    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.material = new THREE.MeshBasicMaterial({ color: SCREEN_OFF });
  }

  const textures: Partial<Record<ModelName, THREE.Texture>> = {};
  for (const name of MODEL_NAMES) {
    const texture = items[`baked_${name}`];
    if (!(texture instanceof THREE.Texture)) continue;
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    textures[name] = texture;
  }

  return { models: scenes, screens, textures, steam: findSteam(items.coffeeSteam) };
}

/** First mesh of the optional `coffeeSteam.glb`, moved out of its file keeping its world transform. */
function findSteam(file: LoadedFile | undefined): THREE.Mesh | undefined {
  if (!file || file instanceof THREE.Texture) return undefined;
  file.scene.updateMatrixWorld(true);
  let found: THREE.Mesh | undefined;
  file.scene.traverse((child) => {
    if (!found && child instanceof THREE.Mesh) found = child;
  });
  if (!found) return undefined;
  const mesh: THREE.Mesh = found;
  mesh.removeFromParent();
  mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
  return mesh;
}

function missing(what: string): null {
  console.warn(`[room] ${what} did not load; using the placeholder room.`);
  return null;
}
