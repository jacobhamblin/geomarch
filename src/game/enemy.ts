import * as THREE from "three";
import { createProceduralZombie } from "./zombie";

export const ENEMY_COLOR = 0xff2222;

export function createEnemyGroup(
  scene: THREE.Scene,
  x: number,
  y: number,
  size: number,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const baseSpacing = 0.8;
  const positions = [];

  // Calculate positions in a grid formation with random spacing
  const gridSize = Math.ceil(Math.sqrt(size));
  for (let i = 0; i < size; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    // Add random variation to spacing with increased range
    const horizontalVariation = (Math.random() - 0.5) * 1.2; // ±0.6
    const verticalVariation = (Math.random() - 0.5) * 1.2; // ±0.6

    // Calculate base position
    const baseX = (col - (gridSize - 1) / 2) * baseSpacing;
    const baseY = (row - (gridSize - 1) / 2) * baseSpacing;

    // Add random offset to create more organic formation with increased range
    const offsetX = Math.sin(row * 0.5) * 0.4; // Wave-like horizontal offset
    const offsetY = Math.cos(col * 0.5) * 0.4; // Wave-like vertical offset

    // Add occasional large gaps
    const hasLargeGap = Math.random() < 0.2; // 20% chance of a large gap
    const largeGapX = hasLargeGap ? (Math.random() - 0.5) * 1.5 : 0; // ±0.75
    const largeGapY = hasLargeGap ? (Math.random() - 0.5) * 1.5 : 0; // ±0.75

    positions.push({
      x: baseX + horizontalVariation + offsetX + largeGapX,
      y: baseY + verticalVariation + offsetY + largeGapY,
    });
  }

  // Create zombies at each position
  for (const pos of positions) {
    const zombie = createProceduralZombie();
    zombie.position.set(x + pos.x, y + pos.y, 0);
    zombie.scale.set(0.4, 0.4, 0.4); // Make zombies 20% smaller
    scene.add(zombie);
    meshes.push(zombie as unknown as THREE.Mesh); // Type assertion needed since Group is not Mesh
  }

  return meshes;
}
