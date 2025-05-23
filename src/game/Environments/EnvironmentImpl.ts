import * as THREE from "three";

export interface EnvironmentImpl {
  /**
   * Initialize the environment, loading any necessary assets and adding objects to the scene
   */
  initialize(scene: THREE.Scene): Promise<void>;

  /**
   * Update the environment's objects each frame
   */
  update(delta: number, now: number): void;

  /**
   * Clean up any resources when the environment is no longer needed
   */
  cleanup(): void;
}
