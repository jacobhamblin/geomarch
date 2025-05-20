import * as THREE from "three";

export interface EnemyGroup {
  mesh: THREE.Mesh;
  size: number;
  y: number;
}

export interface Powerup {
  mesh: THREE.Mesh;
  hitCount: number;
  y: number;
  type: "fireRate" | "units";
}
