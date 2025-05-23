import type { EnvironmentImpl } from "./Environments/EnvironmentImpl";
import { GAME_CONFIG } from "./GameConfig";
import { CrystalCavernsEnvironment } from "./Environments/CrystalCaverns";

export interface Environment {
  id: number;
  name: string;
  implementation: EnvironmentImpl;
}

export const environments: Environment[] = [
  {
    id: 1,
    name: "CrystalCaverns",
    implementation: new CrystalCavernsEnvironment(GAME_CONFIG),
  },
  //   {
  //     id: 2,
  //     name: "Desert",
  //     implementation: new DesertEnvironment(GAME_CONFIG),
  //   },
];
