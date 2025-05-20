import * as THREE from "three";
import { getFormationPositions } from "./formation";

export function createProceduralSoldier(): THREE.Group {
  const soldier = new THREE.Group();

  // === Colors ===
  const uniformColors = [
    0x335533, // Olive
    0x223344, // Navy
    0x555555, // Grey
    0x442222, // Maroon
  ];
  const skinColors = [0xe0c097, 0xd6a77a, 0x8d5524, 0xf1c27d];
  const weaponColors = [0x222222, 0x444444];

  const uniformMat = new THREE.MeshStandardMaterial({
    color: uniformColors[Math.floor(Math.random() * uniformColors.length)],
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColors[Math.floor(Math.random() * skinColors.length)],
  });
  const weaponMat = new THREE.MeshStandardMaterial({
    color: weaponColors[Math.floor(Math.random() * weaponColors.length)],
  });

  // === Head ===
  const headType = Math.random();
  let headGeo: THREE.BufferGeometry;
  if (headType < 0.5) {
    headGeo = new THREE.SphereGeometry(0.4, 6, 6); // helmet
  } else {
    headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6); // cap or bare
  }
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 2.7;
  soldier.add(head);

  // === Torso ===
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.6), uniformMat);
  torso.position.y = 1.5;
  soldier.add(torso);

  // === Legs ===
  const legGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const leg1 = new THREE.Mesh(legGeo, uniformMat);
  const leg2 = new THREE.Mesh(legGeo, uniformMat);
  leg1.position.set(-0.3, 0.6, 0);
  leg2.position.set(0.3, 0.6, 0);
  soldier.add(leg1, leg2);

  // === Arms ===
  const armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const arm1 = new THREE.Mesh(armGeo, uniformMat);
  const arm2 = new THREE.Mesh(armGeo, uniformMat);
  arm1.position.set(-0.9, 2.1, 0);
  arm2.position.set(0.9, 2.1, 0);
  soldier.add(arm1, arm2);

  // === Weapon ===
  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.7, 0.1),
    weaponMat,
  );
  weapon.position.set(0.9, 2.1, 0.3);
  weapon.rotation.x = Math.PI / 2;
  soldier.add(weapon);

  // === Scale variation ===
  const scale = 0.9 + Math.random() * 0.2; // 0.9x to 1.1x
  soldier.scale.set(scale, scale, scale);

  return soldier;
}

export function createPlayerFormation(
  scene: THREE.Scene,
  playerUnits: number,
  centerX: number,
  playerY: number,
): THREE.Group[] {
  const soldiers: THREE.Group[] = [];
  const spacing = 1.2; // Increased spacing for soldiers
  const positions = getFormationPositions(playerUnits, spacing);

  for (let i = 0; i < playerUnits; i++) {
    const soldier = createProceduralSoldier();
    soldier.position.set(centerX + positions[i].x, playerY + positions[i].y, 0);
    soldier.scale.set(0.45, 0.45, 0.45); // Scale up soldiers by 50%
    soldiers.push(soldier);
    scene.add(soldier);
  }

  return soldiers;
}

export function shootBulletFrom(
  scene: THREE.Scene,
  x: number,
  y: number,
  color: number,
): THREE.Mesh {
  const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  // Adjust bullet spawn position to come from the weapon
  bullet.position.set(x + 0.3, y + 0.3, 0); // Offset to come from the weapon
  scene.add(bullet);
  return bullet;
}
