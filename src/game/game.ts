import * as THREE from "three";
import { createEnemyGroup } from "./enemy";
import { getFormationPositions } from "./formation";

let renderer: THREE.WebGLRenderer | undefined,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  animationId: number;
let playerMeshes: THREE.Mesh[] = [];
interface EnemyGroup {
  mesh: THREE.Mesh;
  size: number;
  y: number;
  meshes: THREE.Mesh[];
}
interface Powerup {
  mesh: THREE.Mesh;
  hitCount: number;
  y: number;
  type: "fireRate" | "units";
}
let enemyGroups: EnemyGroup[] = [],
  enemyLabels: THREE.Sprite[] = [],
  powerups: Powerup[] = [],
  powerupLabels: THREE.Sprite[] = [];
let bullets: { mesh: THREE.Mesh; lane: number }[] = [];
let lastShotTime = 0;
const BULLET_SPEED = 0.2;
const FIRE_INTERVAL = 1000; // ms

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
const ENEMY_COUNT = 10;
const POWERUP_COUNT = 10;
const ENEMY_SPEED = 0.02;
const POWERUP_SPEED = 0.02;
const POWERUP_COLOR = 0x22ff22;
const POWERUP_ALT_COLOR = 0xffff22;
let pointerX = 0; // -1 (left) to 1 (right)
let playerUnits = 1;
let gameOver = false;
let victory = false;
let fireInterval = FIRE_INTERVAL;
let lastFrameTime = 0;

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
  overlay.innerHTML = `<div>${message}</div><button style='font-size:2rem;margin-top:2rem' onclick='window.location.reload()'>Return to Menu</button>`;
}

function updatePlayerUnitsDisplay() {
  // No longer needed, so do nothing
}

function updatePlayerMeshes(centerX = 0) {
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
    mesh.position.set(centerX + positions[i].x, PLAYER_Y + positions[i].y, 0);
    playerMeshes.push(mesh);
    scene.add(mesh);
  }
}

export function initGame(container: HTMLElement): void {
  // Clean up previous game if any
  if (renderer) {
    cancelAnimationFrame(animationId);
    renderer.dispose();
    container.innerHTML = "";
    window.onkeydown = null;
    window.ontouchstart = null;
  }
  enemyGroups = [];
  enemyLabels = [];
  powerups = [];
  powerupLabels = [];
  bullets = [];
  lastShotTime = 0;
  pointerX = 0;
  playerUnits = 1;
  gameOver = false;
  victory = false;
  fireInterval = FIRE_INTERVAL;
  updatePlayerUnitsDisplay();

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
  // PerspectiveCamera: field of view and aspect ratio will handle visible area
  // Removed camera.left, camera.right, camera.updateProjectionMatrix (not valid for PerspectiveCamera)

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

  // Player unit (simple box)
  updatePlayerMeshes();

  // Spawn enemy groups in left lane
  for (let i = 0; i < ENEMY_COUNT; i++) {
    let enemySize;
    if (i < 2) {
      // First two waves: 3 to 7 enemies
      enemySize = Math.floor(Math.random() * 5) + 3; // 3, 4, 5, 6, 7
    } else {
      enemySize = Math.floor(Math.random() * 10) + 5;
    }
    const y = 4 + i * 4.5;
    const enemyMeshes = createEnemyGroup(scene, LANE_LEFT_X, y, enemySize);
    enemyGroups.push({
      mesh: enemyMeshes[0],
      size: enemySize,
      y,
      meshes: enemyMeshes,
    });
    // No label for enemy count
    enemyLabels.push(null as any); // placeholder for compatibility
  }

  // Spawn powerups in right lane
  for (let i = 0; i < POWERUP_COUNT; i++) {
    const hitCount = Math.floor(Math.random() * 5) + 2;
    const y = 6 + i * 4;
    const isFireRate = i % 2 === 0;
    const color = isFireRate ? POWERUP_COLOR : POWERUP_ALT_COLOR;
    const powerupGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const powerupMaterial = new THREE.MeshBasicMaterial({ color });
    const powerup = new THREE.Mesh(powerupGeometry, powerupMaterial);
    powerup.position.set(LANE_RIGHT_X, y, 0);
    scene.add(powerup);
    powerups.push({
      mesh: powerup,
      hitCount,
      y,
      type: isFireRate ? "fireRate" : "units",
    });
    // Add label
    const label = createTextSprite(
      hitCount.toString(),
      isFireRate ? "#fff" : "#222",
      48,
    );
    label.position.set(LANE_RIGHT_X, y + 1, 2);
    scene.add(label);
    powerupLabels.push(label);
  }

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

  function shootBulletFrom(x: number, y: number) {
    const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: PLAYER_COLOR });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(x, y, 0);
    scene.add(bullet);
    bullets.push({ mesh: bullet, lane: x < 0 ? -1 : 1 });
  }

  function animate(): void {
    if (gameOver || victory) return;
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000; // seconds
    lastFrameTime = now;
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
    for (let i = enemyGroups.length - 1; i >= 0; i--) {
      const group = enemyGroups[i];
      // Move all meshes in the group
      for (const mesh of group.meshes) {
        mesh.position.y -= ENEMY_SPEED * delta * 60;
      }
      group.y = group.mesh.position.y;
      // Enemy reaches player
      if (group.mesh.position.y <= PLAYER_Y + 0.5) {
        playerUnits -= group.size;
        updatePlayerUnitsDisplay();
        // Remove all meshes in the group
        for (const mesh of group.meshes) scene.remove(mesh);
        enemyGroups.splice(i, 1);
        enemyLabels.splice(i, 1);
        if (playerUnits <= 0) {
          gameOver = true;
          showOverlay("Game Over!");
          return;
        }
      } else if (group.mesh.position.y < PLAYER_Y - 2) {
        for (const mesh of group.meshes) scene.remove(mesh);
        enemyGroups.splice(i, 1);
        enemyLabels.splice(i, 1);
      }
    }
    // Move powerups down
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.mesh.position.y -= POWERUP_SPEED * delta * 60;
      p.y = p.mesh.position.y;
      powerupLabels[i].position.y = p.mesh.position.y + 1;
      powerupLabels[i].position.z = 2;
      if (p.mesh.position.y < PLAYER_Y - 2) {
        scene.remove(p.mesh);
        scene.remove(powerupLabels[i]);
        powerups.splice(i, 1);
        powerupLabels.splice(i, 1);
      }
    }
    // Bullet movement and collision
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      // Move bullet upward
      b.mesh.position.y += BULLET_SPEED * delta * 60;
      if (b.mesh.position.y > 30) {
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        continue;
      }
      // Check collision with enemies
      for (let j = enemyGroups.length - 1; j >= 0; j--) {
        const group = enemyGroups[j];
        if (
          Math.abs(b.mesh.position.x - group.mesh.position.x) < 0.8 &&
          Math.abs(b.mesh.position.y - group.mesh.position.y) < 1
        ) {
          group.size--;
          // Remove one mesh from the group and from the scene
          const removedMesh = group.meshes.pop();
          if (removedMesh) scene.remove(removedMesh);
          scene.remove(b.mesh);
          bullets.splice(i, 1);
          if (group.size <= 0) {
            // Remove any remaining meshes (should be none)
            for (const mesh of group.meshes) scene.remove(mesh);
            enemyGroups.splice(j, 1);
            enemyLabels.splice(j, 1);
          }
          break;
        }
      }
      // Check collision with powerups
      for (let j = powerups.length - 1; j >= 0; j--) {
        const p = powerups[j];
        if (
          Math.abs(b.mesh.position.x - p.mesh.position.x) < 0.8 &&
          Math.abs(b.mesh.position.y - p.mesh.position.y) < 1
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
          scene.remove(b.mesh);
          bullets.splice(i, 1);
          if (p.hitCount <= 0) {
            scene.remove(p.mesh);
            scene.remove(powerupLabels[j]);
            // Apply powerup effect
            if (p.type === "fireRate") {
              fireInterval = Math.max(200, fireInterval / 2);
            } else if (p.type === "units") {
              playerUnits++;
              updatePlayerUnitsDisplay();
              updatePlayerMeshes(targetX);
            }
            powerups.splice(j, 1);
            powerupLabels.splice(j, 1);
          }
          break;
        }
      }
    }
    // Shooting logic
    if (now - lastShotTime > fireInterval) {
      for (let i = 0; i < playerUnits; i++) {
        const mesh = playerMeshes[i];
        shootBulletFrom(mesh.position.x, mesh.position.y);
      }
      lastShotTime = now;
    }
    // Victory check
    if (!victory && enemyGroups.length === 0) {
      victory = true;
      showOverlay("Victory!");
      return;
    }
    if (renderer) {
      renderer.render(scene, camera);
    }
  }
  animate();
}
