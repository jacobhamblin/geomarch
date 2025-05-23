import * as THREE from "three";
// import { createEnemyGroup } from "./enemy";
import type { ZombieUserData } from "./zombie";
import { createPlayerFormation, shootBulletFrom } from "./soldier";
import { throttleLog } from "../utils";
import { createProceduralZombie } from "./zombie";
import { environments, type Environment } from "./environment";

let renderer: THREE.WebGLRenderer | undefined,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  animationId: number;
let playerMeshes: THREE.Group[] = [];
interface Powerup {
  mesh: THREE.Mesh;
  hitCount: number;
  y: number;
  type: "fireRate" | "units";
}
interface State {
  playerUnits: number;
  enemyUnits: number;
  enemyUnitBullets: number;
  fireInterval: number;
}
interface EnvProp {
  mesh: THREE.Group;
  y: number;
  z: number;
  side: "left" | "right";
  nextRespawn: number;
}
let powerups: Powerup[] = [],
  powerupLabels: THREE.Sprite[] = [];
let bullets: {
  mesh: THREE.Mesh;
  lane: number;
  startY: number;
  startZ: number;
}[] = [];
let currentEnvironment: (typeof environments)[0];
let lastShotTime = 0;
const BULLET_SPEED = 0.2;
const FIRE_INTERVAL = 2000; // ms
let state: State = {
  playerUnits: 1,
  enemyUnits: 0,
  enemyUnitBullets: 0,
  fireInterval: FIRE_INTERVAL,
};

// Game constants
const PLAYER_Y = -8;
const LANE_WIDTH = 3.6; // 20% wider than 3
const GAP_PX = 10;
const LANE_LEFT_X = -LANE_WIDTH / 2 - GAP_PX / 100;
const LANE_RIGHT_X = LANE_WIDTH / 2 + GAP_PX / 100;
const SCENE_MARGIN = LANE_WIDTH / 2; // half a lane width
const SCENE_LEFT = LANE_LEFT_X - SCENE_MARGIN;
const SCENE_RIGHT = LANE_RIGHT_X + SCENE_MARGIN;
export const PLAYER_COLOR = 0x0077ff;
const ENEMY_LANE_COLOR = 0xff5555;
const POWERUP_LANE_COLOR = 0x55ff55;
const PLAYER_MOVE_SPEED = 0.2;
const ENEMY_SPEED = 0.02;
const POWERUP_SPEED = 0.02;
const POWERUP_COLOR = 0x22ff22;
const POWERUP_ALT_COLOR = 0xffff22;
let pointerX = 0; // -1 (left) to 1 (right)
let gameOver = false;
let victory = false;
let lastFrameTime = 0;
let lastEnemySpawnTime = 0;
let lastPowerupSpawnTime = 0;
const ENEMY_SPAWN_INTERVAL = 5000; // 5 seconds between enemy spawns
const POWERUP_SPAWN_INTERVAL = 8000; // 8 seconds between powerup spawns
const ENEMY_SPAWN_Y = 12; // Spawn enemies 12 units above player
const POWERUP_SPAWN_Y = 12; // Spawn powerups 12 units above player
const REQUIRED_WAVES = 10; // Number of enemy waves needed for victory
const TRAVEL_TIME = 11000; // Seconds for enemies/powerups to reach player
let wavesSpawned = 0; // Counter for number of enemy waves spawned

// Replace enemyGroups and related variables with a flat enemies array
let enemies: THREE.Mesh[] = [];

const PERSPECTIVE_START_Z = 0;
const PERSPECTIVE_END_Z = 3; // More subtle effect (was 7)

function createTextSprite(
  message: string,
  color = "#fff",
  fontSize = 48,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 128;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillText(message, canvas.width / 2, 10);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 1, 1);
  return sprite;
}

function showOverlay(message: string) {
  let overlay = document.getElementById("game-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "game-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "1000";
    overlay.style.color = "#fff";
    overlay.style.fontSize = "3rem";
    overlay.style.flexDirection = "column";
    document.body.appendChild(overlay);
  }

  // Clean up game state
  if (renderer) {
    cancelAnimationFrame(animationId);
    renderer.dispose();
    renderer = undefined;
  }

  // Clear all game objects
  powerups = [];
  powerupLabels = [];
  bullets = [];
  playerMeshes = [];

  overlay.innerHTML = `<div>${message}</div><button style='font-size:2rem;margin-top:2rem' onclick='document.getElementById("game-overlay").remove(); window.location.reload();'>Return to Menu</button>`;

  currentEnvironment.implementation.cleanup();
}

function updatePlayerMeshes(centerX = 0) {
  // Remove old meshes
  if (playerMeshes.length > 0) {
    for (const mesh of playerMeshes) scene.remove(mesh);
  }
  playerMeshes = createPlayerFormation(
    scene,
    state.playerUnits,
    centerX,
    PLAYER_Y,
    PERSPECTIVE_END_Z, // Set player z position to match elevated perspective
  );
}

function createBullet(x: number, y: number) {
  const bullet = shootBulletFrom(scene, x, y, PLAYER_COLOR);
  bullet.position.z = PERSPECTIVE_END_Z; // Start bullet at player's z position
  bullets.push({
    mesh: bullet,
    lane: x < 0 ? -1 : 1,
    startY: y,
    startZ: PERSPECTIVE_END_Z,
  });
}

function calculatePlayerBulletsPerSecond(): number {
  const result = (1000 / state.fireInterval) * state.playerUnits;
  throttleLog("calculatePlayerBulletsPerSecond", result);
  return result;
}

function calculateEnemyGroupSize(): number {
  const bulletsPerSecond = calculatePlayerBulletsPerSecond();
  // Calculate how many bullets the player can fire during the travel time
  // const totalBullets = bulletsPerSecond * (TRAVEL_TIME / 1000);
  const totalBullets = bulletsPerSecond * (ENEMY_SPAWN_INTERVAL / 1000);

  // Base size on total bullets, assuming each zombie takes 2-3 hits
  // const hitsPerZombie = 2 + Math.random(); // Random between 2 and 3
  // const maxZombies = Math.floor(totalBullets / hitsPerZombie);

  // Ensure we have at least 3 zombies and cap at 15
  // const groupSize = Math.min(15, Math.max(3, maxZombies));
  // const groupSize = maxZombies;
  // return Math.floor(totalBullets);
  const spareBullets = totalBullets - state.enemyUnitBullets;
  const result = Math.floor(spareBullets * 0.8);
  throttleLog("calculateEnemyGroupSize", result);
  return result;
}

function calculatePowerupHitCount(): number {
  const bulletsPerSecond = calculatePlayerBulletsPerSecond();
  // Calculate how many bullets the player can fire during the travel time
  const totalBullets = bulletsPerSecond * (TRAVEL_TIME / 1000);

  // Make powerups require about 60% of the player's total bullets
  const hitCount = Math.ceil(totalBullets * 0.6);

  // Ensure hit count is at least 2 and cap at 15
  const result = Math.min(15, Math.max(2, hitCount));
  throttleLog("calculatePowerupHitCount", result);
  return result;
}

function spawnEnemies() {
  const enemyHealthBudget = calculateEnemyGroupSize();
  // Space zombies within the left lane only
  const laneCenter = LANE_LEFT_X;
  const laneWidth = LANE_WIDTH * 0.8; // Use 80% of lane width for spacing
  // Calculate how many zombies we can spawn based on the budget
  // We'll assume an average health of 2 per zombie to determine count
  const count = Math.max(1, Math.floor(enemyHealthBudget / 2));
  // Vertical spread: spread zombies over a range depending on count
  const verticalSpread = Math.max(2, Math.min(4, count * 0.5)); // 2 to 4 units
  for (let i = 0; i < count; i++) {
    const zombie = createProceduralZombie();
    const zombieData = zombie.userData as ZombieUserData;
    // Random x position within the entire lane width
    const x = laneCenter - laneWidth / 2 + Math.random() * laneWidth;
    // Evenly space zombies vertically (y)
    const y =
      count === 1
        ? ENEMY_SPAWN_Y
        : ENEMY_SPAWN_Y +
          verticalSpread / 2 -
          (verticalSpread * i) / (count - 1);
    zombie.position.set(x, y, 0);
    zombie.scale.set(0.4, 0.4, 0.4);
    scene.add(zombie as unknown as THREE.Mesh);
    enemies.push(zombie as unknown as THREE.Mesh);
    state.enemyUnitBullets += zombieData.health;
    state.enemyUnits += 1;
  }
  wavesSpawned++;
  throttleLog(
    "spawnEnemies",
    count,
    state.enemyUnitBullets,
    state.enemyUnits,
    state.playerUnits,
  );
}

function spawnPowerup() {
  const hitCount = calculatePowerupHitCount();
  const isFireRate = Math.random() < 0.5;
  const color = isFireRate ? POWERUP_COLOR : POWERUP_ALT_COLOR;
  const powerupGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const powerupMaterial = new THREE.MeshBasicMaterial({ color });
  const powerup = new THREE.Mesh(powerupGeometry, powerupMaterial);
  powerup.position.set(LANE_RIGHT_X, POWERUP_SPAWN_Y, 0);
  scene.add(powerup);
  powerups.push({
    mesh: powerup,
    hitCount,
    y: POWERUP_SPAWN_Y,
    type: isFireRate ? "fireRate" : "units",
  });
  // Add label
  const label = createTextSprite(
    hitCount.toString(),
    isFireRate ? "#fff" : "#222",
    48,
  );
  label.position.set(LANE_RIGHT_X, POWERUP_SPAWN_Y + 1, 2);
  scene.add(label);
  powerupLabels.push(label);
}

export async function initGame(container: HTMLElement): Promise<void> {
  // Remove any existing game overlay
  const existingOverlay = document.getElementById("game-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Clean up previous game if any
  if (renderer) {
    cancelAnimationFrame(animationId);
    renderer.dispose();
    container.innerHTML = "";
    window.onkeydown = null;
    window.ontouchstart = null;
  }

  // Reset all game state
  powerups = [];
  powerupLabels = [];
  bullets = [];
  lastShotTime = 0;
  pointerX = 0;
  state = {
    playerUnits: 1,
    enemyUnits: 0,
    enemyUnitBullets: 0,
    fireInterval: FIRE_INTERVAL,
  };
  gameOver = false;
  victory = false;
  lastFrameTime = 0;
  lastEnemySpawnTime = 0;
  lastPowerupSpawnTime = 0;
  wavesSpawned = 0; // Reset wave counter

  // Select random environment
  currentEnvironment =
    environments[Math.floor(Math.random() * environments.length)];

  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.z = 15;
  camera.position.y = 0;

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(-5, 10, 5); // Position light from top-left
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Draw lanes (as transparent boxes for now)
  const laneGeometry = new THREE.BoxGeometry(LANE_WIDTH, 20, 0.1);
  const leftLaneMaterial = new THREE.MeshBasicMaterial({
    color: ENEMY_LANE_COLOR,
    transparent: true,
    opacity: 0.1,
  });
  const rightLaneMaterial = new THREE.MeshBasicMaterial({
    color: POWERUP_LANE_COLOR,
    transparent: true,
    opacity: 0.1,
  });

  const leftLane = new THREE.Mesh(laneGeometry, leftLaneMaterial);
  leftLane.position.x = LANE_LEFT_X;
  scene.add(leftLane);

  const rightLane = new THREE.Mesh(laneGeometry, rightLaneMaterial);
  rightLane.position.x = LANE_RIGHT_X;
  scene.add(rightLane);

  // Initialize environment
  await currentEnvironment.implementation.initialize(scene);

  // Player unit (simple box)
  updatePlayerMeshes();

  // Spawn initial wave of enemies
  spawnEnemies();
  lastEnemySpawnTime = performance.now();

  // Mouse/touch controls for player movement
  function updatePointerFromEvent(x: number) {
    const rect = container.getBoundingClientRect();
    const rel = (x - rect.left) / rect.width; // 0 (left) to 1 (right)
    // Map mouse position to scene coordinates
    const minX = SCENE_LEFT;
    const maxX = SCENE_RIGHT;
    const sceneX = minX + (maxX - minX) * rel;
    // Clamp to lane range
    pointerX = (sceneX - LANE_LEFT_X) / (LANE_RIGHT_X - LANE_LEFT_X);
    pointerX = Math.max(0, Math.min(1, pointerX));
  }
  container.onmousemove = (e) => {
    updatePointerFromEvent(e.clientX);
  };
  container.ontouchstart = (e) => {
    if (e.touches && e.touches.length > 0) {
      updatePointerFromEvent(e.touches[0].clientX);
      e.preventDefault();
    }
  };
  container.ontouchmove = (e) => {
    if (e.touches && e.touches.length > 0) {
      updatePointerFromEvent(e.touches[0].clientX);
      e.preventDefault();
    }
  };

  function animate(): void {
    if (gameOver || victory) return;
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000; // seconds
    lastFrameTime = now;

    // Spawn new enemies and powerups based on timing
    if (now - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
      spawnEnemies();
      lastEnemySpawnTime = now;
    }
    if (now - lastPowerupSpawnTime > POWERUP_SPAWN_INTERVAL) {
      spawnPowerup();
      lastPowerupSpawnTime = now;
    }

    // Animate zombies
    for (const zombie of enemies) {
      const zombieData = zombie.userData as ZombieUserData;
      if (zombieData.animate) {
        zombieData.animate(now / 1000);
      }
    }

    // Player follows pointerX between lanes
    const minX = LANE_LEFT_X;
    const maxX = LANE_RIGHT_X;
    const targetX = minX + (maxX - minX) * pointerX;
    // Move the whole formation so its center is at targetX
    // Calculate current formation center
    if (playerMeshes.length > 0) {
      // Find center x of current formation
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
    // Move enemies down
    for (let i = enemies.length - 1; i >= 0; i--) {
      const zombie = enemies[i];
      const zombieData = zombie.userData as ZombieUserData;
      // Adjust speed based on zombie type
      let speedMultiplier = 1.0;
      if (zombieData.isCrawling) {
        speedMultiplier = 1.2; // 20% faster
      } else if (zombieData.isFat) {
        speedMultiplier = 0.8; // 20% slower
      }
      // Move down
      zombie.position.y -= ENEMY_SPEED * speedMultiplier * delta * 60;
      // Perspective effect: move closer to camera as they move down
      // At ENEMY_SPAWN_Y, z=PERSPECTIVE_START_Z; at PLAYER_Y, z=PERSPECTIVE_END_Z
      const startY = ENEMY_SPAWN_Y;
      const endY = PLAYER_Y;
      const t = Math.max(
        0,
        Math.min(1, (startY - zombie.position.y) / (startY - endY)),
      );
      zombie.position.z =
        PERSPECTIVE_START_Z + (PERSPECTIVE_END_Z - PERSPECTIVE_START_Z) * t;

      // Check if any zombie in the group has reached the player
      let anyZombieReached = false;
      if (zombie.position.y <= PLAYER_Y + 0.5) {
        anyZombieReached = true;
      }

      if (anyZombieReached) {
        // Use actual number of remaining zombies for damage
        state.playerUnits -= 1;
        // Remove the zombie
        scene.remove(zombie);
        enemies.splice(i, 1);
        if (state.playerUnits <= 0) {
          gameOver = true;
          showOverlay("Game Over!");
          return;
        }
      } else if (zombie.position.y < PLAYER_Y - 2) {
        // Remove any zombies that go past the player
        scene.remove(zombie);
        enemies.splice(i, 1);
      }
    }
    // Move powerups down
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.mesh.position.y -= POWERUP_SPEED * delta * 60;
      p.y = p.mesh.position.y;
      powerupLabels[i].position.y = p.mesh.position.y + 1;
      // Perspective effect: move closer to camera as they move down
      // At POWERUP_SPAWN_Y, z=PERSPECTIVE_START_Z; at PLAYER_Y, z=PERSPECTIVE_END_Z
      const startY = POWERUP_SPAWN_Y;
      const endY = PLAYER_Y;
      const t = Math.max(
        0,
        Math.min(1, (startY - p.mesh.position.y) / (startY - endY)),
      );
      p.mesh.position.z =
        PERSPECTIVE_START_Z + (PERSPECTIVE_END_Z - PERSPECTIVE_START_Z) * t;
      powerupLabels[i].position.z = p.mesh.position.z + 2;
      if (p.mesh.position.y < PLAYER_Y - 2) {
        scene.remove(p.mesh);
        scene.remove(powerupLabels[i]);
        powerups.splice(i, 1);
        powerupLabels.splice(i, 1);
      }
    }
    // Bullet movement and collision
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      // Move bullet upward
      bullet.mesh.position.y += BULLET_SPEED * delta * 60;
      // Interpolate z position based on y position
      // As bullet moves from startY up, z goes from startZ to PERSPECTIVE_START_Z
      const totalYTravel = 30 - bullet.startY; // 30 is the y at which bullet is removed
      const currentYTravel = bullet.mesh.position.y - bullet.startY;
      const t = Math.max(0, Math.min(1, currentYTravel / totalYTravel));
      bullet.mesh.position.z =
        bullet.startZ + (PERSPECTIVE_START_Z - bullet.startZ) * t;
      if (bullet.mesh.position.y > 30) {
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        continue;
      }

      // Determine which lane the bullet is in
      const bulletLane = bullet.mesh.position.x < 0 ? -1 : 1;

      // Check for collisions with enemies in the same lane
      for (let j = enemies.length - 1; j >= 0; j--) {
        const zombie = enemies[j];
        const enemyLane = zombie.position.x < 0 ? -1 : 1;

        if (bulletLane === enemyLane) {
          // Check each zombie in the group for collision
          const zombieData = zombie.userData as ZombieUserData;
          // Adjust collision range based on zombie type
          const collisionRange = zombieData.isFat ? 2.5 : 1.5; // Fat zombies have larger collision range

          if (
            Math.abs(bullet.mesh.position.y - zombie.position.y) <
            collisionRange
          ) {
            // Reduce health of this zombie
            zombieData.health -= 1;

            // Remove bullet
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            state.enemyUnitBullets -= 1;

            // Remove the zombie if its health reaches 0
            if (zombieData.health <= 0) {
              scene.remove(zombie);
              enemies.splice(j, 1);
              state.enemyUnits -= 1;
            }

            break; // Bullet can only hit one zombie
          }
        }
      }

      // Check collision with powerups in the same lane
      for (let j = powerups.length - 1; j >= 0; j--) {
        const p = powerups[j];
        const powerupLane = p.mesh.position.x < 0 ? -1 : 1;
        if (bulletLane === powerupLane) {
          // Check if bullet is within the vertical range of the powerup
          const verticalRange = 1.5; // How far above/below the powerup to check
          if (
            Math.abs(bullet.mesh.position.y - p.mesh.position.y) < verticalRange
          ) {
            p.hitCount--;
            // Update the powerup label to show the new hitCount
            if (powerupLabels[j] && powerupLabels[j].material.map) {
              const newLabel = createTextSprite(
                p.hitCount.toString(),
                p.type === "fireRate" ? "#fff" : "#222",
                48,
              );
              powerupLabels[j].material.map = new THREE.CanvasTexture(
                newLabel.material.map!.image,
              );
            }
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            if (p.hitCount <= 0) {
              scene.remove(p.mesh);
              scene.remove(powerupLabels[j]);
              // Apply powerup effect
              if (p.type === "fireRate") {
                state.fireInterval = Math.max(200, state.fireInterval / 2);
              } else if (p.type === "units") {
                state.playerUnits++;
                updatePlayerMeshes(targetX);
              }
              powerups.splice(j, 1);
              powerupLabels.splice(j, 1);
            }
            break;
          }
        }
      }
    }
    // Shooting logic
    if (now - lastShotTime > state.fireInterval) {
      for (let i = 0; i < state.playerUnits; i++) {
        const mesh = playerMeshes[i];
        createBullet(mesh.position.x, mesh.position.y);
      }
      lastShotTime = now;
    }
    // Victory check
    if (!victory && enemies.length === 0 && wavesSpawned >= REQUIRED_WAVES) {
      victory = true;
      showOverlay("Victory!");
      return;
    }

    // Update environment
    currentEnvironment.implementation.update(delta, now);

    if (renderer) {
      renderer.render(scene, camera);
    }
  }
  animate();
}
