import { GRID_SIZE, type CellCoord, type Grid8x8 } from './types';

export const CAT_NAP_INTERVAL = 18;
export const CAT_NAP_BONUS = 250;
const edge = GRID_SIZE - 2;
const corners = [{r: 0, c: 0}, {r: 0, c: edge}, {r: edge, c: 0}, {r: edge, c: edge}];

export function validNapCorner(value: CellCoord | null | undefined): CellCoord | null {
  return corners.find(({r, c}) => r === value?.r && c === value?.c) ?? null;
}

export function settleCatNap(grid: Grid8x8, nap: CellCoord | null, moves: number, rows: number[], cols: number[]) {
  const empty = ({r, c}: CellCoord) => !grid[r][c] && !grid[r + 1][c] && !grid[r][c + 1] && !grid[r + 1][c + 1];
  if (nap) {
    const woke = rows.includes(nap.r - 1) || rows.includes(nap.r + 2) || cols.includes(nap.c - 1) || cols.includes(nap.c + 2);
    return { nap: woke || !empty(nap) ? null : nap, bonus: woke ? CAT_NAP_BONUS : 0 };
  }
  return { nap: moves > 0 && moves % CAT_NAP_INTERVAL === 0 ? corners.find(empty) ?? null : null, bonus: 0 };
}
