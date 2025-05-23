// Shared game configuration for environments and game logic
export type GameConfigType = {
  laneLeftX: number;
  laneRightX: number;
  laneWidth: number;
  enemySpawnY: number;
  playerY: number;
  perspectiveStartZ: number;
  perspectiveEndZ: number;
};

export const GAME_CONFIG: GameConfigType = {
  laneLeftX: -1.8, // Default, will be overwritten in game.ts
  laneRightX: 1.8,
  laneWidth: 3.6,
  enemySpawnY: 12,
  playerY: -8,
  perspectiveStartZ: 0,
  perspectiveEndZ: 3,
};
