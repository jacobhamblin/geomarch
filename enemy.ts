import * as THREE from 'three';
import { getFormationPositions } from './formation';

export const ENEMY_COLOR = 0xff2222;

export function createEnemyGroup(scene: THREE.Scene, laneX: number, y: number, groupSize: number): THREE.Mesh[] {
  const boxSize = 0.6;
  const spacing = 0.7;
  const positions = getFormationPositions(groupSize, spacing);
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < groupSize; i++) {
    const enemyGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: ENEMY_COLOR });
    const mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    mesh.position.set(laneX + positions[i].x, y + positions[i].y, 0);
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
} 