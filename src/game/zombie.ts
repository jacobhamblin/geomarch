import * as THREE from "three";

interface ZombieUserData {
  arm1: THREE.Mesh;
  arm2: THREE.Mesh;
  head: THREE.Mesh;
  animate: (time: number) => void;
}

export function createProceduralZombie(): THREE.Group {
  const zombie = new THREE.Group();

  // === Randomized parameters ===
  const skinColors = [
    0x99cc99, // Classic green
    0x88bb88, // Lighter green
    0x77aa77, // Darker green
    0x99aa88, // Yellowish green
    0xcc9999, // Warm tone
    0xbb8888, // Lighter warm
    0xaa7777, // Darker warm
    0x99cccc, // Cyan tint
    0xcc99cc, // Purple tint
    0xcccc99, // Yellow tint
  ];
  const shirtColors = [
    0x444444, // Dark gray
    0x222222, // Black
    0x666666, // Light gray
    0x335544, // Dark green
    0x553333, // Dark red
    0x333355, // Dark blue
    0x553355, // Dark purple
    0x335533, // Forest green
    0x553322, // Brown
    0x223355, // Navy blue
  ];
  const pantsColors = [
    0x333333, // Dark gray
    0x222222, // Black
    0x111111, // Very dark
    0x554433, // Brown
    0x332233, // Dark purple
    0x223322, // Dark green
    0x332222, // Dark red
    0x222233, // Dark blue
    0x443322, // Light brown
  ];

  const skinColor = new THREE.Color(
    skinColors[Math.floor(Math.random() * skinColors.length)],
  );
  const shirtColor = new THREE.Color(
    shirtColors[Math.floor(Math.random() * shirtColors.length)],
  );
  const pantsColor = new THREE.Color(
    pantsColors[Math.floor(Math.random() * pantsColors.length)],
  );

  // === Materials ===
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor });

  // === Size variation ===
  const isBaby = Math.random() < 0.2; // 20% chance of being a baby zombie
  const scale = isBaby ? 0.6 : 1.0;
  zombie.scale.set(scale, scale, scale);

  // === Head ===
  const headType = Math.random();
  let headGeo: THREE.BufferGeometry;
  if (headType < 0.3) {
    headGeo = new THREE.BoxGeometry(1, 1, 1);
  } else if (headType < 0.6) {
    headGeo = new THREE.SphereGeometry(0.6, 6, 6);
  } else {
    // Skull-like head
    headGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const eyeHoles = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    eyeHoles.position.set(0.2, 0.1, 0.5);
    zombie.add(eyeHoles);
    const eyeHoles2 = eyeHoles.clone();
    eyeHoles2.position.x = -0.2;
    zombie.add(eyeHoles2);
  }
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 2.75;
  zombie.add(head);

  // === Torso ===
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.6), shirtMat);
  torso.position.y = 1.5;
  zombie.add(torso);

  // === Legs ===
  const legGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const leg1 = new THREE.Mesh(legGeo, pantsMat);
  const leg2 = new THREE.Mesh(legGeo, pantsMat);
  leg1.position.set(-0.3, 0.6, 0);
  leg2.position.set(0.3, 0.6, 0);
  zombie.add(leg1);
  zombie.add(leg2);

  // === Arms ===
  const armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const arm1 = new THREE.Mesh(armGeo, skinMat);
  const arm2 = new THREE.Mesh(armGeo, skinMat);
  arm1.position.set(-0.9, 2.1, 0);
  arm2.position.set(0.9, 2.1, 0);
  zombie.add(arm1);
  zombie.add(arm2);

  // === Weapons ===
  const hasWeapon = Math.random() < 0.3; // 30% chance of having a weapon
  if (hasWeapon) {
    const weaponGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const weapon = new THREE.Mesh(weaponGeo, weaponMat);
    weapon.position.set(1.2, 2.1, 0);
    weapon.rotation.z = Math.PI / 4; // Angle the weapon
    zombie.add(weapon);
  }

  // === Animation timing variation ===
  const timeOffset = Math.random() * Math.PI * 2; // Random offset between 0 and 2π
  const animationSpeed = 0.8 + Math.random() * 0.4; // Random speed between 0.8x and 1.2x

  // === Subtle animation-ready config ===
  zombie.userData = {
    arm1,
    arm2,
    head,
    animate: (time: number) => {
      const sway = Math.sin((time + timeOffset) * animationSpeed * 2) * 0.1;
      zombie.rotation.y = sway;
      arm1.rotation.z =
        Math.sin((time + timeOffset) * animationSpeed * 4) * 0.2;
      arm2.rotation.z =
        -Math.sin((time + timeOffset) * animationSpeed * 4) * 0.2;
      // Add some head bobbing
      head.position.y =
        2.75 + Math.sin((time + timeOffset) * animationSpeed * 3) * 0.1;
    },
  } as ZombieUserData;

  return zombie;
}
