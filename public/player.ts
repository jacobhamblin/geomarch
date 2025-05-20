import * as THREE from "three";
import { PLAYER_COLOR } from "./game";
import { getFormationPositions } from "./formation";
import type { Vector2 } from "./formation";

export let playerMeshes: THREE.Mesh[] = [];

export function createPlayerMeshes(
  scene: THREE.Scene,
  playerUnits: number,
  PLAYER_Y: number,
): void {
  // Remove old meshes
  if (playerMeshes.length > 0) {
    for (const mesh of playerMeshes) scene.remove(mesh);
  }
  playerMeshes = [];
  const boxSize = 0.6;
  const spacing = 0.7;
  const positions = getFormationPositions(playerUnits, spacing);
  for (let i = 0; i < playerUnits; i++) {
    const playerGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: PLAYER_COLOR });
    const mesh = new THREE.Mesh(playerGeometry, playerMaterial);
    mesh.position.set(positions[i].x, PLAYER_Y + positions[i].y, 0);
    playerMeshes.push(mesh);
    scene.add(mesh);
  }
}

export function updatePlayerFormation(
  targetX: number,
  PLAYER_MOVE_SPEED: number,
  delta: number,
) {
  if (playerMeshes.length > 0) {
    let sumX = 0;
    for (const mesh of playerMeshes) sumX += mesh.position.x;
    const centerX = sumX / playerMeshes.length;
    const dx = targetX - centerX;
    for (const mesh of playerMeshes) {
      if (Math.abs(dx) > 0.01) {
        mesh.position.x += dx * PLAYER_MOVE_SPEED * delta * 60;
      } else {
        mesh.position.x += dx;
      }
    }
  }
}

export function shootFromAll(
  scene: THREE.Scene,
  playerMeshes: THREE.Mesh[],
  PLAYER_Y: number,
  shootBulletFrom: (x: number) => void,
) {
  for (let i = 0; i < playerMeshes.length; i++) {
    const mesh = playerMeshes[i];
    shootBulletFrom(mesh.position.x);
  }
}
