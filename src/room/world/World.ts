import * as THREE from 'three';
import { MODEL_NAMES, SCREEN_NAMES, type ModelName, type RoomSource, type ScreenName } from '../assets';

/**
 * Puts a RoomSource into the scene (analysis section 4.6).
 *
 * A model with a baked texture gets an unlit material showing that texture.
 * A model without one gets the clay material, and the two fallback lights are
 * added as soon as one model needs them (lights do not affect the baked ones).
 * The animated objects, screens and interactions hang off this class later.
 */
export default class World {
  models: Record<ModelName, THREE.Group>;
  screens: Record<ScreenName, THREE.Mesh>;

  private scene: THREE.Scene;
  private root = new THREE.Group();
  private clay: THREE.MeshStandardMaterial | null = null;

  constructor(scene: THREE.Scene, source: RoomSource) {
    this.scene = scene;
    this.models = source.models;
    this.screens = source.screens;
    this.root.name = 'world';

    for (const name of MODEL_NAMES) {
      const group = source.models[name];
      const texture = source.textures[name];
      const material = texture
        ? new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
        : this.getClay();

      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
      });
      this.root.add(group);
    }

    for (const name of SCREEN_NAMES) this.root.add(source.screens[name]);

    scene.add(this.root);
  }

  /** Creates the clay material and the fallback lights the first time a model needs them. */
  private getClay(): THREE.MeshStandardMaterial {
    if (!this.clay) {
      this.clay = new THREE.MeshStandardMaterial({ color: '#e8e5e0', roughness: 0.85 });

      const sun = new THREE.DirectionalLight('#ffffff', 2.2);
      sun.position.set(6, 8, 6);
      this.root.add(sun, new THREE.AmbientLight('#ffffff', 0.9));
    }
    return this.clay;
  }

  update(): void {
    // Chair, roomba, steam and screens tick here from step 4 on.
  }

  destroy(): void {
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
  }
}
