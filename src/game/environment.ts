import type { EnvironmentImpl } from "./Environments/EnvironmentImpl";

export interface Environment {
  id: number;
  name: string;
  implementation: EnvironmentImpl;
}

export const environments: Environment[] = [
  {
    id: 1,
    name: "CrystalCaverns",
    implementation: new (
      await import("./Environments/CrystalCaverns")
    ).CrystalCavernsEnvironment(),
  },
  //   {
  //     id: 2,
  //     name: "Desert",
  //     implementation: new (
  //       await import("./Environments/Desert")
  //     ).DesertEnvironment(),
  //   },
];
