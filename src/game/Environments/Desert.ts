import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import type { EnvironmentImpl } from "./EnvironmentImpl";

export class DesertEnvironment implements EnvironmentImpl {
  private scene: THREE.Scene | null = null;
  private propMeshes: THREE.Group[] = [];
  private envProps: {
    mesh: THREE.Group;
    y: number;
    z: number;
    side: "left" | "right";
    nextRespawn: number;
  }[] = [];

  // Environment-specific properties
  private readonly numObjects = 3;
  // private readonly ambientColorPairs = [
  //   ["#E6BE8A", "#D2B48C"],
  //   ["#8B4513", "#A0522D"],
  // ];
  // private readonly skyColorPairs = [
  //   ["#87CEEB", "#B0E0E6"],
  //   ["#F0F8FF", "#F0F8FF"],
  // ];
  // private readonly lightColorPairs = [
  //   ["#FF7F50", "#FFA07A"],
  //   ["#FA8072", "#E9967A"],
  // ];

  // Game constants
  private readonly laneLeftX: number;
  private readonly laneRightX: number;
  private readonly playerSpawnHeight: number;
  private readonly perspectiveStartZ: number;
  private readonly perspectiveEndZ: number;

  constructor() {
    // These values should match the game constants
    this.laneLeftX = -1.8;
    this.laneRightX = 1.8;
    this.playerSpawnHeight = -8;
    this.perspectiveStartZ = 0;
    this.perspectiveEndZ = 3;
  }

  async initialize(scene: THREE.Scene): Promise<void> {
    this.scene = scene;
    await this.loadProps();
    this.createInitialProps();
  }

  private async loadProps(): Promise<void> {
    const loader = new OBJLoader();
    const basePath = "src/assets/Desert";

    for (let i = 1; i <= this.numObjects; i++) {
      try {
        const obj = await loader.loadAsync(`${basePath}/${i}.obj`);
        this.propMeshes.push(obj);
      } catch (e) {
        console.warn(`Could not load prop: ${basePath}/${i}.obj`, e);
      }
    }
  }

  private createInitialProps(): void {
    for (let i = 0; i < 2; i++) {
      this.createProp();
    }
  }

  private createProp(): void {
    if (!this.scene || this.propMeshes.length === 0) return;

    // Randomly pick a mesh
    const mesh =
      this.propMeshes[
        Math.floor(Math.random() * this.propMeshes.length)
      ].clone();

    // Randomly assign side
    const side = Math.random() < 0.5 ? "left" : "right";

    // Set initial y (randomly spaced above the player)
    const y = this.playerSpawnHeight + 12 + Math.random() * 5;

    // Set initial z
    const z = this.perspectiveStartZ;

    mesh.position.y = y;
    mesh.position.z = z;
    mesh.position.x =
      side === "left" ? this.laneLeftX - 1.8 - 1 : this.laneRightX + 1.8 + 1;

    this.scene.add(mesh);
    this.envProps.push({ mesh, y, z, side, nextRespawn: 0 });
  }

  update(delta: number, _now: number): void {
    if (!this.scene) return;

    // Move props down
    for (let i = this.envProps.length - 1; i >= 0; i--) {
      const prop = this.envProps[i];
      prop.mesh.position.y -= 0.02 * delta * 60;
      prop.y = prop.mesh.position.y;

      // Perspective effect
      const startY = this.playerSpawnHeight + 12;
      const endY = this.playerSpawnHeight;
      const t = Math.max(
        0,
        Math.min(1, (startY - prop.mesh.position.y) / (startY - endY)),
      );
      prop.mesh.position.z =
        this.perspectiveStartZ +
        (this.perspectiveEndZ - this.perspectiveStartZ) * t;

      // Respawn if past player
      if (prop.mesh.position.y < this.playerSpawnHeight - 2) {
        this.scene.remove(prop.mesh);
        this.envProps.splice(i, 1);
        this.createProp();
      }
    }
  }

  cleanup(): void {
    if (!this.scene) return;

    // Remove all props
    for (const prop of this.envProps) {
      this.scene.remove(prop.mesh);
    }

    // Clear arrays
    this.envProps = [];
    this.propMeshes = [];
    this.scene = null;
  }
}
