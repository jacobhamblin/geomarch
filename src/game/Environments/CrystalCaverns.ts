import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import type { EnvironmentImpl } from "./EnvironmentImpl";

interface EnvProp {
  mesh: THREE.Mesh;
  y: number;
  z: number;
  side: "left" | "right";
  nextRespawn: number;
  lights: {
    left: THREE.SpotLight;
    right: THREE.SpotLight;
  };
  colorPairIndex: number;
  floatOffset: number;
  floatSpeed: number;
  floatPhase: number;
  spinSpeed: number;
}

export interface CrystalCavernsConfig {
  laneLeftX: number;
  laneRightX: number;
  laneWidth: number;
  enemySpawnY: number;
  playerY: number;
  perspectiveStartZ: number;
  perspectiveEndZ: number;
}

export class CrystalCavernsEnvironment implements EnvironmentImpl {
  private scene: THREE.Scene | null = null;
  private propMeshes: THREE.Mesh[] = [];
  private envProps: EnvProp[] = [];
  private readonly laneLeftX: number;
  private readonly laneRightX: number;
  private readonly laneWidth: number;
  private readonly enemySpawnY: number;
  private readonly playerY: number;
  private readonly perspectiveStartZ: number;
  private readonly perspectiveEndZ: number;

  // Environment-specific properties
  private readonly numObjects = 3;
  private readonly ambientColorPairs = [
    ["#0F1B2B", "#16213E"],
    ["#2B1B3D", "#1E1B2E"],
  ];
  // private readonly skyColorPairs = [
  //   ["#1A1A1A", "#2B2B2B"],
  //   ["#1E1E1E", "#2D2D2D"],
  // ];
  private readonly lightColorPairs = [
    ["#ff0000", "#7700ff"],
    ["#cc00ff", "#00aaff"],
    ["#0000ff", "#00ff00"],
  ];
  // private readonly objColors = [0xaaaaaa, 0x777777, 0xaaaaaa];
  private readonly objColors = [0xaaaaaa, 0x777777];

  constructor(
    config: CrystalCavernsConfig = CrystalCavernsEnvironment.defaultConfig(),
  ) {
    this.laneLeftX = config.laneLeftX;
    this.laneRightX = config.laneRightX;
    this.laneWidth = config.laneWidth;
    this.enemySpawnY = config.enemySpawnY;
    this.playerY = config.playerY;
    this.perspectiveStartZ = config.perspectiveStartZ;
    this.perspectiveEndZ = config.perspectiveEndZ;
  }

  static defaultConfig(): CrystalCavernsConfig {
    return {
      laneLeftX: -1.8,
      laneRightX: 1.8,
      laneWidth: 3.6,
      enemySpawnY: 12,
      playerY: -8,
      perspectiveStartZ: 0,
      perspectiveEndZ: 3,
    };
  }

  async initialize(scene: THREE.Scene): Promise<void> {
    this.scene = scene;
    await this.loadProps();
    this.createInitialProps();
    this.createLanes();
  }

  private createLanes(): void {
    if (!this.scene) return;

    // Draw lanes (as transparent boxes for now)
    const laneGeometry = new THREE.BoxGeometry(this.laneWidth, 20, 0.1);
    const leftLaneMaterial = new THREE.MeshBasicMaterial({
      color: this.ambientColorPairs[0][0],
      transparent: true,
      opacity: 0.1,
    });
    const rightLaneMaterial = new THREE.MeshBasicMaterial({
      color: this.ambientColorPairs[0][1],
      transparent: true,
      opacity: 0.1,
    });

    const leftLane = new THREE.Mesh(laneGeometry, leftLaneMaterial);
    leftLane.position.x = this.laneLeftX;
    this.scene.add(leftLane);

    const rightLane = new THREE.Mesh(laneGeometry, rightLaneMaterial);
    rightLane.position.x = this.laneRightX;
    this.scene.add(rightLane);
  }

  private async loadProps(): Promise<void> {
    if (!this.scene) return;

    const loader = new OBJLoader();
    this.propMeshes = [];

    for (let i = 1; i <= this.numObjects; i++) {
      try {
        const obj = await loader.loadAsync(
          `src/assets/CrystalCaverns/${i}.obj`,
        );
        console.log(`Loaded prop ${i}:`, obj);

        // const scale = 3;
        // obj.scale.set(scale, scale, scale);
        const mesh = obj.children[0] as THREE.Mesh;
        const randomColor =
          this.objColors[Math.floor(Math.random() * this.objColors.length)];
        mesh.material = new THREE.MeshStandardMaterial({
          color: randomColor,
          metalness: 0.5,
          roughness: 0.5,
        });
        mesh.scale.set(0.002, 0.002, 0.002);
        mesh.rotation.x = 45;

        this.propMeshes.push(mesh);
      } catch (e) {
        console.warn(
          `Could not load prop: src/assets/CrystalCaverns/${i}.obj`,
          e,
        );
      }
    }
    console.log("Total props loaded:", this.propMeshes.length);
  }

  private createInitialProps(): void {
    if (!this.scene) return;

    this.envProps = [];
    // Create 4 props instead of 6
    const numProps = 4;
    // Calculate base spacing between props - much larger now
    const baseSpacing = 15; // Increased from 5 to 15 for much wider spacing
    const randomVariation = 3; // Slightly increased variation

    for (let i = 0; i < numProps; i++) {
      // Calculate base y position with even spacing
      const baseY = this.enemySpawnY - i * baseSpacing;
      // Add random variation
      const randomOffset = (Math.random() - 0.5) * randomVariation;
      const y = baseY + randomOffset;

      // Create prop with specific y position
      this.createProp(y);
    }
  }

  private createProp(y?: number): void {
    if (!this.scene || this.propMeshes.length === 0) return;

    const mesh =
      this.propMeshes[
        Math.floor(Math.random() * this.propMeshes.length)
      ].clone();
    console.log("Creating prop with mesh:", mesh); // Debug log

    const side = Math.random() < 0.5 ? "left" : "right";
    // Use provided y position or generate random one
    const propY = y ?? this.enemySpawnY + Math.random() * 5;
    const z = this.perspectiveStartZ;
    // Place objects closer to camera (z = 1 instead of perspectiveStartZ)
    // const z = 0.3;

    // Randomly select a color pair for this prop
    const colorPairIndex = Math.floor(
      Math.random() * this.lightColorPairs.length,
    );
    const [leftColor, rightColor] = this.lightColorPairs[colorPairIndex];

    // Create lights
    const leftLight = new THREE.SpotLight(
      leftColor,
      15,
      30,
      Math.PI / 3,
      0.5,
      1,
    );
    const rightLight = new THREE.SpotLight(
      rightColor,
      15,
      30,
      Math.PI / 3,
      0.5,
      1,
    );

    // Position lights relative to the prop
    const lightOffset = 8;
    const lightHeight = 3;
    const lightDepth = 2;
    leftLight.position.set(-lightOffset, lightHeight, lightDepth);
    rightLight.position.set(lightOffset, lightHeight, lightDepth);

    // Point lights at the prop
    leftLight.target = mesh;
    rightLight.target = mesh;

    // Add lights to the scene (not the mesh) so they maintain their position
    this.scene.add(leftLight);
    this.scene.add(rightLight);
    // this.scene.add(leftLight.target);
    // this.scene.add(rightLight.target);

    // Add a stronger ambient light to each prop
    // const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    // mesh.add(ambientLight);

    // Add a spotlight from above for additional illumination
    // const spotLight = new THREE.SpotLight(
    //   0xffffff,
    //   10,
    //   30,
    //   Math.PI / 4,
    //   0.5,
    //   1
    // );
    // spotLight.position.set(0, 5, 0);
    // spotLight.target = mesh;
    // this.scene.add(spotLight);
    // this.scene.add(spotLight.target);

    mesh.position.y = propY;
    mesh.position.z = z;
    // Add random horizontal variation
    const horizontalVariation = Math.random() * 2 - 1; // Random value between -0.25 and 0.25
    mesh.position.x =
      side === "left"
        ? this.laneLeftX - this.laneWidth / 2 - 1 + horizontalVariation
        : this.laneRightX + this.laneWidth / 2 + 1 + horizontalVariation;
    // Place objects in the lanes instead of outside
    // mesh.position.x = side === "left" ? this.laneLeftX : this.laneRightX;

    this.scene.add(mesh);
    this.envProps.push({
      mesh,
      y: propY,
      z,
      side,
      nextRespawn: 0,
      lights: { left: leftLight, right: rightLight },
      colorPairIndex,
      floatOffset: 0,
      floatSpeed: 0.002 + Math.random() * 0.003,
      floatPhase: Math.random() * Math.PI * 2,
      spinSpeed: 0.003 + Math.random() * 0.02,
    });
  }

  update(delta: number, now: number): void {
    if (!this.scene) return;

    for (const prop of this.envProps) {
      prop.y -= 0.02 * delta * 60; // ENEMY_SPEED

      // Update floating animation
      prop.floatPhase += prop.floatSpeed;
      prop.floatOffset = Math.cos(prop.floatPhase) * 0.2; // Amplitude of 0.2 units

      // Update spinning animation - continuous rotation
      prop.mesh.rotation.y += prop.spinSpeed;

      // Perspective effect
      const startY = this.enemySpawnY;
      const endY = this.playerY;
      const t = Math.max(0, Math.min(1, (startY - prop.y) / (startY - endY)));
      prop.z =
        this.perspectiveStartZ +
        (this.perspectiveEndZ - this.perspectiveStartZ) * t;
      prop.mesh.position.y = prop.y + prop.floatOffset; // Add floating offset to y position
      prop.mesh.position.z = prop.z;

      // Update light positions to follow the prop
      const lightOffset = 8;
      const lightHeight = 3;
      const lightDepth = 2;
      prop.lights.left.position.set(
        prop.mesh.position.x - lightOffset,
        prop.mesh.position.y + lightHeight,
        prop.mesh.position.z + lightDepth,
      );
      prop.lights.right.position.set(
        prop.mesh.position.x + lightOffset,
        prop.mesh.position.y + lightHeight,
        prop.mesh.position.z + lightDepth,
      );

      // If off screen, schedule respawn
      if (prop.y < this.playerY - 2 && prop.nextRespawn === 0) {
        prop.nextRespawn = now + (5000 + Math.random() * 5000);
      }
      // Respawn if time
      if (prop.nextRespawn && now > prop.nextRespawn) {
        prop.y = this.enemySpawnY + Math.random() * 5;
        prop.side = Math.random() < 0.5 ? "left" : "right";
        // Add random horizontal variation on respawn
        const horizontalVariation = (Math.random() - 0.5) * 0.5; // Random value between -0.25 and 0.25
        prop.mesh.position.x =
          prop.side === "left"
            ? this.laneLeftX - this.laneWidth / 2 - 1 + horizontalVariation
            : this.laneRightX + this.laneWidth / 2 + 1 + horizontalVariation;

        // Update light colors on respawn
        const newColorPairIndex = Math.floor(
          Math.random() * this.lightColorPairs.length,
        );
        const [leftColor, rightColor] = this.lightColorPairs[newColorPairIndex];
        prop.lights.left.color.set(leftColor);
        prop.lights.right.color.set(rightColor);
        prop.colorPairIndex = newColorPairIndex;

        // Reset animation properties with new random values
        prop.floatSpeed = 0.002 + Math.random() * 0.003;
        prop.floatPhase = Math.random() * Math.PI * 2;
        prop.spinSpeed = 0.01 + Math.random() * 0.02;

        prop.nextRespawn = 0;
      }
    }
  }

  cleanup(): void {
    if (!this.scene) return;

    for (const prop of this.envProps) {
      // Remove lights from the mesh
      prop.mesh.remove(prop.lights.left);
      prop.lights.left.dispose();
      prop.mesh.remove(prop.lights.right);
      prop.lights.right.dispose();

      this.scene.remove(prop.mesh);
    }
    this.envProps = [];
    this.propMeshes = [];
    this.scene = null;
  }
}
