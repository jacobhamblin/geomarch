interface Environment {
  id: number;
  name: string;
  ambientColorPairs: string[][];
  skyColorPairs: string[][];
  lightColorPairs: string[][];
}

export const environments: Environment[] = [
  {
    id: 1,
    name: "CrystalCaverns",
    ambientColorPairs: [
      ["#0F1B2B", "#16213E"],
      ["#2B1B3D", "#1E1B2E"],
    ],
    skyColorPairs: [
      ["#1A1A1A", "#2B2B2B"],
      ["#1E1E1E", "#2D2D2D"],
    ],
    lightColorPairs: [
      ["#ff0000", "#7700ff"],
      ["#cc00ff", "#00aaff"],
      ["#0000ff", "#00ff00"],
    ],
  },
  {
    id: 2,
    name: "Desert",
    ambientColorPairs: [
      ["#E6BE8A", "#D2B48C"],
      ["#8B4513", "#A0522D"],
    ],
    skyColorPairs: [
      ["#87CEEB", "#B0E0E6"],
      ["#F0F8FF", "#F0F8FF"],
    ],
    lightColorPairs: [
      ["#FF7F50", "#FFA07A"],
      ["#FA8072", "#E9967A"],
    ],
  },
];
