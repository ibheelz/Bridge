import * as THREE from 'three';
import {
  MODEL_NAMES,
  ROOMBA_PATH_FILE,
  COMPUTER_SCREENS,
  type ModelName,
  type RoomSource,
  type ComputerId,
  type RoomScreens,
} from '../assets';
import type Time from '../utils/Time';
import ChairTop from './ChairTop';
import CoffeeSteam from './CoffeeSteam';
import Door from './Door';
import Roomba from './Roomba';
import Screens, { type ScreensOptions } from './Screens';
import Outdoors from './Outdoors';

/**
 * Puts a RoomSource into the scene (analysis section 4.6).
 *
 * A model with a baked texture gets an unlit material showing that texture.
 * A model without one gets the clay material, and the two fallback lights are
 * added as soon as one model needs them (lights do not affect the baked ones).
 * The animated objects (section 5) are created here and ticked from `update()`;
 * `liveScreens` draws the screen contents (section 6). Pointer interactions
 * are in `Interactions.ts`, created by Experience once the world exists.
 */
export default class World {
  models: Record<ModelName, THREE.Group>;
  screens: RoomScreens;
  /** The CRT screen of each computer in this room (the right one is optional). */
  computers: Partial<Record<ComputerId, THREE.Mesh>> = {};
  chairTop: ChairTop;
  roomba: Roomba;
  coffeeSteam: CoffeeSteam | null = null;
  /** Contents of the screens; `screens` above holds the meshes. */
  liveScreens: Screens;
  door: Door;
  /** Sky, ground, hills and trees around the room, coloured for the visitor's time of day. */
  outdoors: Outdoors;

  private scene: THREE.Scene;
  private time: Time;
  private root = new THREE.Group();
  private clay: THREE.MeshStandardMaterial | null = null;
  private tinted = new Map<string, THREE.MeshStandardMaterial>();
  /** Colours of the materials `setDim` has darkened, to bring them back. */
  private dimmed = new Map<THREE.Material, THREE.Color>();

  constructor(scene: THREE.Scene, time: Time, source: RoomSource, options: ScreensOptions = {}) {
    this.scene = scene;
    this.time = time;
    this.models = source.models;
    this.screens = source.screens;
    this.root.name = 'world';
    this.outdoors = new Outdoors(source.groundY);
    this.root.add(this.outdoors.group);

    for (const name of MODEL_NAMES) {
      const group = source.models[name];
      const texture = source.textures[name];
      const baked = texture ? new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }) : null;

      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        // Without a bake, a mesh may ask for a clay colour of its own (the placeholder does).
        const tint = child.userData.clayColor as string | undefined;
        // Window glass: flagged in the placeholder, or named `windowGlass…` in a GLB. Faint, so the outside shows.
        if (child.userData.windowGlass || child.name.startsWith('windowGlass')) {
          child.material = this.outdoors.glass;
        } else {
          child.material = baked ?? (tint ? this.getTinted(tint) : this.getClay());
        }
        child.castShadow = false;
        child.receiveShadow = false;
      });
      this.root.add(group);
    }

    for (const mesh of Object.values(source.screens)) if (mesh) this.root.add(mesh);
    for (const [id, name] of Object.entries(COMPUTER_SCREENS) as [ComputerId, keyof RoomScreens][]) {
      const mesh = source.screens[name];
      if (mesh) this.computers[id] = mesh;
    }

    this.chairTop = new ChairTop(this.models.chairTop);
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    this.roomba = new Roomba(this.models.roomba, base + ROOMBA_PATH_FILE);
    if (source.steam) {
      this.coffeeSteam = new CoffeeSteam(source.steam);
      this.root.add(source.steam);
    }
    this.liveScreens = new Screens(this.screens, options);
    // After the screens are in `root`: the door takes the whiteboard over.
    this.door = new Door(this.models.door, this.screens.screenWhiteboard, source.doorOpenAngle);

    scene.add(this.root);
  }

  /** Clay in another colour, one material per colour; needs the same fallback lights. */
  private getTinted(color: string): THREE.MeshStandardMaterial {
    const clay = this.getClay();
    let material = this.tinted.get(color);
    if (!material) {
      material = clay.clone();
      material.color.set(color);
      this.tinted.set(color, material);
    }
    return material;
  }

  /** Creates the clay material and the fallback lights the first time a model needs them. */
  private getClay(): THREE.MeshStandardMaterial {
    if (!this.clay) {
      this.clay = new THREE.MeshStandardMaterial({ color: '#e8e5e0', roughness: 0.85 });

      const sun = new THREE.DirectionalLight('#ffffff', 2.2);
      // Straight in front and above, so both side walls get the same light.
      sun.position.set(0, 8, 7);
      this.root.add(sun, new THREE.AmbientLight('#ffffff', 0.9));
    }
    return this.clay;
  }

  /**
   * Lights-out for CRT mode (analysis section 8.1): multiplies every material
   * colour down, 1 = as built, 0 = black. The CRT screen has its own level so
   * it can go dark after the room. Meshes whose material has no colour (the
   * steam shader) are hidden while their level is below 1. `crtMesh` is the
   * screen of the computer being used; the other one dims with the room.
   */
  setDim(room: number, crt: number, crtMesh: THREE.Mesh = this.screens.screenCRT): void {
    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const level = child === crtMesh ? crt : room;
      const material = child.material as THREE.Material | THREE.Material[];
      for (const m of Array.isArray(material) ? material : [material]) {
        // The outdoor shaders take a dim level as a uniform rather than a colour.
        const uniforms = (m as THREE.ShaderMaterial).uniforms;
        if (uniforms?.uDim) {
          uniforms.uDim.value = level;
          continue;
        }
        const color = (m as THREE.MeshBasicMaterial).color;
        if (!(color instanceof THREE.Color)) {
          child.visible = level >= 1;
          continue;
        }
        let original = this.dimmed.get(m);
        if (!original) {
          original = color.clone();
          this.dimmed.set(m, original);
        }
        color.copy(original).multiplyScalar(level);
      }
    });
    if (room >= 1 && crt >= 1) this.dimmed.clear();
  }

  update(): void {
    this.chairTop.update(this.time.elapsed);
    this.roomba.update(this.time.delta);
    this.coffeeSteam?.update(this.time.elapsed);
    this.liveScreens.update(this.time.delta);
    this.door.update(this.time.delta);
    this.outdoors.update(this.time.delta);
  }

  destroy(): void {
    this.roomba.destroy();
    this.liveScreens.destroy();
    this.door.destroy();
    this.scene.remove(this.root);
    const materials = new Set<THREE.Material>();
    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const material = child.material as THREE.Material | THREE.Material[];
      for (const m of Array.isArray(material) ? material : [material]) materials.add(m);
    });
    for (const material of materials) {
      (material as THREE.MeshBasicMaterial).map?.dispose();
      material.dispose();
    }
    // The base clay may be unused when every mesh has its own colour.
    this.clay?.dispose();
    this.outdoors.destroy();
  }
}
