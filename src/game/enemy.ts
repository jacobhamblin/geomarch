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

  // Adjust group size based on expected special zombies
  const adjustedSize = adjustGroupSizeForSpecialZombies(size);

  // Calculate positions in a grid formation with random spacing
  const gridSize = Math.ceil(Math.sqrt(adjustedSize));
  for (let i = 0; i < adjustedSize; i++) {
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
    const largeGapX = hasLargeGap ? Math.abs(Math.random() - 0.5) * 1.5 : 0; // ±0.75
    const largeGapY = hasLargeGap ? Math.abs(Math.random() - 0.5) * 1.5 : 0; // ±0.75

    positions.push({
      x: baseX + horizontalVariation + offsetX + largeGapX,
      y: baseY + verticalVariation + offsetY + largeGapY,
    });
  }

  // Create zombies and sort them by health
  const zombies: { mesh: THREE.Mesh; health: number }[] = [];
  for (const pos of positions) {
    const zombie = createProceduralZombie();
    zombie.position.set(x + pos.x, y + pos.y, 0);
    zombie.scale.set(0.4, 0.4, 0.4); // Make zombies 20% smaller
    const health = (zombie.userData as any).health;
    zombies.push({ mesh: zombie as unknown as THREE.Mesh, health });
  }

  // Sort zombies by health (strongest at the back/higher Y)
  zombies.sort((a, b) => a.health - b.health);

  // Reposition zombies based on their sorted order
  // Strongest zombies go to the back positions (higher Y)
  for (let i = 0; i < zombies.length; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    // Calculate base position
    const baseX = (col - (gridSize - 1) / 2) * baseSpacing;
    const baseY = (row - (gridSize - 1) / 2) * baseSpacing;

    // Add random variation to spacing
    const horizontalVariation = (Math.random() - 0.5) * 1.2; // ±0.6
    const verticalVariation = (Math.random() - 0.5) * 1.2; // ±0.6

    // Add wave-like offset
    const offsetX = Math.sin(row * 0.5) * 0.4;
    const offsetY = Math.cos(col * 0.5) * 0.4;

    // Add occasional large gaps
    const hasLargeGap = Math.random() < 0.2;
    const largeGapX = hasLargeGap ? (Math.random() - 0.5) * 1.5 : 0;
    const largeGapY = hasLargeGap ? Math.abs(Math.random() - 0.5) * 1.5 : 0; // ±0.75

    // Update zombie position
    zombies[i].mesh.position.set(
      x + baseX + horizontalVariation + offsetX + largeGapX,
      y + baseY + verticalVariation + offsetY + largeGapY,
      0,
    );
  }

  // Add zombies to scene in sorted order
  for (const { mesh } of zombies) {
    scene.add(mesh);
    meshes.push(mesh);
  }

  return meshes;
}

// Helper function to adjust group size based on special zombies
export function adjustGroupSizeForSpecialZombies(size: number): number {
  // Count how many special zombies we expect in this group
  const expectedFatZombies = Math.floor(size * 0.15); // 15% chance for fat zombies
  const expectedCrawlingZombies = Math.floor(size * 0.2); // 20% chance for crawling zombies

  // Reduce size based on special zombies
  let adjustedSize = size;
  adjustedSize -= expectedFatZombies * 4; // Each fat zombie reduces group by 4
  adjustedSize -= expectedCrawlingZombies * 2; // Each crawling zombie reduces group by 2

  // Ensure we don't go below 1 zombie
  return Math.max(1, adjustedSize);
}
