export type Vector2 = { x: number; y: number };

// Returns a triangle/pyramid formation for N units, 3 per row
export function getFormationPositions(
  unitCount: number,
  spacing: number,
): Vector2[] {
  const result: Vector2[] = [];

  // Manually-tuned formation patterns for small unit counts
  const formationPatterns: number[][] = [
    [1], // 1 unit
    [2], // 2 units
    [1, 2], // 3 units
    [2, 2], // 4 units
    [2, 3], // 5 units
    [3, 3], // 6 units
    [1, 2, 4], // 7 units
    [2, 3, 3], // 8 units
    [3, 3, 3], // 9 units
  ];

  const pattern = formationPatterns[unitCount - 1];

  if (pattern) {
    // Use custom formation pattern
    for (let row = 0, unitsPlaced = 0; row < pattern.length; row++) {
      const unitsInRow = pattern[row];
      const rowY = -row * spacing;
      const stagger = row % 2 === 1 ? spacing / 2 : 0;

      for (let i = 0; i < unitsInRow; i++) {
        const xOffset = (i - (unitsInRow - 1) / 2) * spacing + stagger;
        result.push({ x: xOffset, y: rowY });
        unitsPlaced++;
        if (unitsPlaced >= unitCount) break;
      }
    }
  } else {
    // Fallback to dynamic triangular growth (row 1 gets 1 unit, row 2 gets 2, etc.)
    let unitsLeft = unitCount;
    let row = 0;

    while (unitsLeft > 0) {
      const unitsInRow = Math.min(row + 1, unitsLeft);
      const rowY = -row * spacing;
      const stagger = row % 2 === 1 ? spacing / 2 : 0;

      for (let i = 0; i < unitsInRow; i++) {
        const xOffset = (i - (unitsInRow - 1) / 2) * spacing + stagger;
        result.push({ x: xOffset, y: rowY });
      }

      unitsLeft -= unitsInRow;
      row++;
    }
  }

  return result;
}
