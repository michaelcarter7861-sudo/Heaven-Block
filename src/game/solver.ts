import {
  ARTISAN_MATERIALS,
  CLASSIC_POLYOMINO_CATALOG,
  createPieceInstance,
  getActiveTierState,
  getTierConfig,
  getUniqueOrientations,
  NON_CLASSIC_SHAPE_IDS,
  POLYOMINO_CATALOG,
  ZEN_PENTOMINO_SHAPES,
  type SeededRng,
} from './shapes';
import {
  GRID_SIZE,
  type CellCoord,
  type GameMode,
  type Grid8x8,
  type MaterialType,
  type PieceInstance,
  type PlacementOutcome,
  type PlacementPreview,
  type PolyominoShape,
  type SpecialBlockType,
} from './types';

export function createEmptyGrid(): Grid8x8 {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

export function cloneGrid(grid: Grid8x8): Grid8x8 {
  return grid.map((row) =>
    row.map((cell) =>
      cell ? { ...cell, justPlaced: false, justSprouted: false } : null
    )
  );
}

export function getBoardOccupancy(grid: Grid8x8): number {
  let activeTotal = 0;
  let filledActive = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = grid[r][c];
      if (cell?.kind === 'blocked') continue;
      activeTotal++;
      if (cell !== null) filledActive++;
    }
  }
  return activeTotal === 0 ? 1 : filledActive / activeTotal;
}

export function canPlaceCells(
  grid: Grid8x8,
  cells: CellCoord[],
  anchorRow: number,
  anchorCol: number
): boolean {
  for (let i = 0; i < cells.length; i++) {
    const r = anchorRow + cells[i].r;
    const c = anchorCol + cells[i].c;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
      return false;
    }
    if (grid[r][c] !== null) {
      return false;
    }
  }
  return true;
}

export function previewPlacement(
  grid: Grid8x8,
  cells: CellCoord[],
  anchorRow: number,
  anchorCol: number
): PlacementPreview {
  const targetCells = cells.map((cell) => ({
    r: anchorRow + cell.r,
    c: anchorCol + cell.c,
  }));

  const valid = canPlaceCells(grid, cells, anchorRow, anchorCol);
  if (!valid) {
    return {
      valid: false,
      anchorRow,
      anchorCol,
      targetCells,
      clearedRows: [],
      clearedCols: [],
      totalClearedLines: 0,
    };
  }

  const targetSet = new Set<number>();
  for (const cell of targetCells) {
    targetSet.add(cell.r * GRID_SIZE + cell.c);
  }

  const clearedRows: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    let activeCellsInRow = 0;
    let full = true;
    for (let c = 0; c < GRID_SIZE; c++) {
      const existing = grid[r][c];
      if (existing?.kind === 'blocked') continue;
      activeCellsInRow++;
      if (existing === null && !targetSet.has(r * GRID_SIZE + c)) {
        full = false;
        break;
      }
    }
    if (activeCellsInRow > 0 && full) clearedRows.push(r);
  }

  const clearedCols: number[] = [];
  for (let c = 0; c < GRID_SIZE; c++) {
    let activeCellsInCol = 0;
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      const existing = grid[r][c];
      if (existing?.kind === 'blocked') continue;
      activeCellsInCol++;
      if (existing === null && !targetSet.has(r * GRID_SIZE + c)) {
        full = false;
        break;
      }
    }
    if (activeCellsInCol > 0 && full) clearedCols.push(c);
  }

  return {
    valid: true,
    anchorRow,
    anchorCol,
    targetCells,
    clearedRows,
    clearedCols,
    totalClearedLines: clearedRows.length + clearedCols.length,
  };
}

export function applyPlacement(
  grid: Grid8x8,
  piece: PieceInstance,
  anchorRow: number,
  anchorCol: number,
  currentCombo: number,
  rng?: SeededRng
): PlacementOutcome {
  const preview = previewPlacement(grid, piece.cells, anchorRow, anchorCol);
  if (!preview.valid) {
    throw new Error(`Invalid placement at (${anchorRow}, ${anchorCol})`);
  }

  const nextGrid = cloneGrid(grid);
  preview.targetCells.forEach((cell, idx) => {
    const isSpecial = idx === piece.specialCellIndex && piece.specialType;
    const hasAcorn = Boolean(piece.acornCellIndices?.includes(idx));
    nextGrid[cell.r][cell.c] = {
      kind: 'tile',
      material: piece.material,
      uid: `${piece.uid}_${cell.r}_${cell.c}`,
      special: isSpecial ? piece.specialType : undefined,
      hasAcornGem: hasAcorn || undefined,
      justPlaced: true,
    };
  });

  const clearedRowSet = new Set(preview.clearedRows);
  const clearedColSet = new Set(preview.clearedCols);
  const L = preview.totalClearedLines;

  // Gather all cells cleared directly by completed lines
  const toClearMap = new Map<string, CellCoord>();
  if (L > 0) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = nextGrid[r][c];
        if (!cell || cell.kind === 'blocked') continue;
        if (clearedRowSet.has(r) || clearedColSet.has(c)) {
          toClearMap.set(`${r}_${c}`, { r, c });
        }
      }
    }
  }

  // Resolve special block chain reactions:
  // 1) Amber Honey Block: clears 4 orthogonal 1-tile neighbors in a golden splash
  //    AND if an Amber Honey splash bridges the last missing gap of another row/col,
  //    triggers a CASCADE chain wave clearing that additional row/column!
  const honeyQueue: CellCoord[] = [];
  for (const coord of toClearMap.values()) {
    const cell = nextGrid[coord.r][coord.c];
    if (cell?.special === 'amber_honey') {
      honeyQueue.push(coord);
    }
  }

  const splashedCells: CellCoord[] = [];
  const splashEmptyCandidates: CellCoord[] = [];
  const orthoOffsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const runHoneyQueue = (
    queue: CellCoord[],
    targetMap: Map<string, CellCoord>,
    emptyCandidates: CellCoord[]
  ) => {
    while (queue.length > 0) {
      const origin = queue.shift()!;
      for (const [dr, dc] of orthoOffsets) {
        const nr = origin.r + dr;
        const nc = origin.c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        const neighbor = nextGrid[nr][nc];
        if (!neighbor) {
          emptyCandidates.push({ r: nr, c: nc });
          continue;
        }
        if (neighbor.kind === 'blocked') continue;
        const key = `${nr}_${nc}`;
        if (!targetMap.has(key)) {
          targetMap.set(key, { r: nr, c: nc });
          splashedCells.push({ r: nr, c: nc });
          if (neighbor.special === 'amber_honey') {
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
  };

  runHoneyQueue(honeyQueue, toClearMap, splashEmptyCandidates);

  // Inspect wave-1 cells being cleared for Lantern Glow, Bloom-Seed, Moss, Acorn Gems, and Flowers
  let lanternDoubled = false;
  let bloomSeedCount = 0;
  let mossCleared = 0;
  let acornGemsCollected = 0;
  let bonusFlowerStars = 0;

  const tallyCell = (cell: NonNullable<Grid8x8[number][number]>) => {
    if (cell.special === 'lantern_glow') lanternDoubled = true;
    if (cell.special === 'bloom_seed') bloomSeedCount++;
    if (cell.kind === 'moss') mossCleared++;
    if (cell.hasAcornGem) acornGemsCollected++;
    if (cell.kind === 'flower') bonusFlowerStars++;
  };

  for (const coord of toClearMap.values()) {
    const cell = nextGrid[coord.r][coord.c];
    if (cell) tallyCell(cell);
  }

  const allClearedKeysSet = new Set<string>(toClearMap.keys());

  // Clear wave-1 affected cells
  for (const coord of toClearMap.values()) {
    nextGrid[coord.r][coord.c] = null;
  }

  // Resolve Amber Honey CASCADE chains:
  // If an empty neighbor hit by an Amber Honey splash is the final missing cell completing
  // another row or column on the remaining board, bridge it and cascade-clear that line!
  let cascadeCount = 0;
  let cascadeLinesCleared = 0;
  let pendingEmptyChecks = splashEmptyCandidates;

  for (let wave = 0; wave < 6 && pendingEmptyChecks.length > 0; wave++) {
    const bridgeCells = new Set<string>();
    const waveRows = new Set<number>();
    const waveCols = new Set<number>();

    for (const cand of pendingEmptyChecks) {
      if (nextGrid[cand.r][cand.c] !== null) continue;

      // Would filling (cand.r, cand.c) complete row cand.r?
      let rowActive = 0;
      let rowComplete = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = nextGrid[cand.r][c];
        if (cell?.kind === 'blocked') continue;
        rowActive++;
        if (c !== cand.c && cell === null) {
          rowComplete = false;
          break;
        }
      }
      if (rowActive > 1 && rowComplete) {
        waveRows.add(cand.r);
        bridgeCells.add(`${cand.r}_${cand.c}`);
      }

      // Would filling (cand.r, cand.c) complete col cand.c?
      let colActive = 0;
      let colComplete = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        const cell = nextGrid[r][cand.c];
        if (cell?.kind === 'blocked') continue;
        colActive++;
        if (r !== cand.r && cell === null) {
          colComplete = false;
          break;
        }
      }
      if (colActive > 1 && colComplete) {
        waveCols.add(cand.c);
        bridgeCells.add(`${cand.r}_${cand.c}`);
      }
    }

    if (waveRows.size === 0 && waveCols.size === 0) break;

    cascadeCount++;
    cascadeLinesCleared += waveRows.size + waveCols.size;

    const cascadeMap = new Map<string, CellCoord>();
    for (const r of waveRows) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = nextGrid[r][c];
        if (cell && cell.kind !== 'blocked') {
          cascadeMap.set(`${r}_${c}`, { r, c });
        }
      }
    }
    for (const c of waveCols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const cell = nextGrid[r][c];
        if (cell && cell.kind !== 'blocked') {
          cascadeMap.set(`${r}_${c}`, { r, c });
        }
      }
    }

    const nextHoneyQueue: CellCoord[] = [];
    for (const coord of cascadeMap.values()) {
      const cell = nextGrid[coord.r][coord.c];
      if (cell?.special === 'amber_honey') {
        nextHoneyQueue.push(coord);
      }
    }
    const nextEmptyCandidates: CellCoord[] = [];
    runHoneyQueue(nextHoneyQueue, cascadeMap, nextEmptyCandidates);

    for (const coord of cascadeMap.values()) {
      const cell = nextGrid[coord.r][coord.c];
      if (cell) tallyCell(cell);
      allClearedKeysSet.add(`${coord.r}_${coord.c}`);
      nextGrid[coord.r][coord.c] = null;
    }
    for (const bKey of bridgeCells) {
      allClearedKeysSet.add(bKey);
    }

    pendingEmptyChecks = nextEmptyCandidates;
  }

  const allClearedKeys = Array.from(allClearedKeysSet);

  // 2) Bloom-Seed Block: sprout a collectible flower on an empty active cell
  const sproutedCells: CellCoord[] = [];
  if (bloomSeedCount > 0) {
    const emptySpots: CellCoord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (nextGrid[r][c] === null) {
          emptySpots.push({ r, c });
        }
      }
    }

    for (let i = 0; i < bloomSeedCount && emptySpots.length > 0; i++) {
      const pickIdx = rng
        ? Math.floor(rng.next() * emptySpots.length)
        : (i * 7 + anchorRow + anchorCol) % emptySpots.length;
      const chosen = emptySpots.splice(pickIdx, 1)[0];
      nextGrid[chosen.r][chosen.c] = {
        kind: 'flower',
        material: 'glazed_ceramic',
        uid: `flw_${piece.uid}_${i}`,
        justSprouted: true,
      };
      sproutedCells.push(chosen);
    }
  }

  // Scoring formula (GDD §6.2 + Phase 2 Lantern Glow 2x + Phase 5 Cascade Chain bonus)
  const placeScore = 10 * piece.cells.length;
  let nextCombo = currentCombo;
  let clearScore = 0;
  let cascadeBonusScore = 0;
  const totalClearedLines = L + cascadeLinesCleared;

  if (L > 0) {
    nextCombo = currentCombo + 1 + cascadeCount;
    const baseClear = 120 * L * (1 + 0.5 * (L - 1));
    const streakBonus = nextCombo > 1 ? 1 + Math.min(nextCombo - 1, 5) * 0.25 : 1;
    const lanternFactor = lanternDoubled ? 2 : 1;
    const splashBonus = splashedCells.length * 25;
    const flowerBonus = bonusFlowerStars * 50;
    if (cascadeLinesCleared > 0) {
      cascadeBonusScore =
        150 * cascadeLinesCleared * (1 + cascadeCount) * lanternFactor;
    }
    clearScore =
      Math.round(baseClear * streakBonus * lanternFactor) +
      splashBonus +
      flowerBonus +
      cascadeBonusScore;

  } else {
    nextCombo = 0;
  }

  return {
    nextGrid,
    clearedRows: preview.clearedRows,
    clearedCols: preview.clearedCols,
    splashedCells,
    sproutedCells,
    allClearedKeys,
    totalClearedLines,
    cascadeCount,
    cascadeLinesCleared,
    cascadeBonusScore,
    placeScore,
    clearScore,
    lanternDoubled,
    totalScoreGained: placeScore + clearScore,
    nextCombo,
    mossCleared,
    acornGemsCollected,
    bonusFlowerStars,
  };
}

// Fast dual-bitmask solver supporting blocked architectural cells & moss obstacles
interface FastBoardMasks {
  occLo: number; // all non-null cells (tile + moss + flower + blocked)
  occHi: number;
  blkLo: number; // permanent architectural blocked cells
  blkHi: number;
}

function gridToMasks(grid: Grid8x8): FastBoardMasks {
  let occLo = 0;
  let occHi = 0;
  let blkLo = 0;
  let blkHi = 0;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = grid[r][c];
      if (cell !== null) {
        const bit = 1 << (r * 8 + c);
        occLo |= bit;
        if (cell.kind === 'blocked') blkLo |= bit;
      }
    }
  }
  for (let r = 4; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = grid[r][c];
      if (cell !== null) {
        const bit = 1 << ((r - 4) * 8 + c);
        occHi |= bit;
        if (cell.kind === 'blocked') blkHi |= bit;
      }
    }
  }

  return { occLo, occHi, blkLo, blkHi };
}

const FULL_ROW_BYTE = 0xff;
const COL_MASKS_4 = Array.from({ length: 8 }, (_, c) => {
  let m = 0;
  for (let r = 0; r < 4; r++) {
    m |= 1 << (r * 8 + c);
  }
  return m;
});

function applyMaskAndClear(
  masks: FastBoardMasks,
  pieceLo: number,
  pieceHi: number
): FastBoardMasks {
  let occLo = masks.occLo | pieceLo;
  let occHi = masks.occHi | pieceHi;

  let clearLo = 0;
  let clearHi = 0;

  // Check rows 0..3 (must have at least 1 non-blocked cell)
  for (let r = 0; r < 4; r++) {
    const shift = r * 8;
    const rowOcc = (occLo >>> shift) & FULL_ROW_BYTE;
    const rowBlk = (masks.blkLo >>> shift) & FULL_ROW_BYTE;
    if (rowOcc === FULL_ROW_BYTE && rowBlk !== FULL_ROW_BYTE) {
      clearLo |= FULL_ROW_BYTE << shift;
    }
  }

  // Check rows 4..7
  for (let r = 0; r < 4; r++) {
    const shift = r * 8;
    const rowOcc = (occHi >>> shift) & FULL_ROW_BYTE;
    const rowBlk = (masks.blkHi >>> shift) & FULL_ROW_BYTE;
    if (rowOcc === FULL_ROW_BYTE && rowBlk !== FULL_ROW_BYTE) {
      clearHi |= FULL_ROW_BYTE << shift;
    }
  }

  // Check cols 0..7 (must have at least 1 non-blocked cell)
  for (let c = 0; c < 8; c++) {
    const cm = COL_MASKS_4[c];
    const colFull = (occLo & cm) === cm && (occHi & cm) === cm;
    const colAllBlocked = (masks.blkLo & cm) === cm && (masks.blkHi & cm) === cm;
    if (colFull && !colAllBlocked) {
      clearLo |= cm;
      clearHi |= cm;
    }
  }

  // Never erase blocked architectural cells!
  occLo &= ~(clearLo & ~masks.blkLo);
  occHi &= ~(clearHi & ~masks.blkHi);

  return {
    occLo,
    occHi,
    blkLo: masks.blkLo,
    blkHi: masks.blkHi,
  };
}

function getAllValidPlacementsMask(
  masks: FastBoardMasks,
  cells: CellCoord[]
): FastBoardMasks[] {
  let maxR = 0;
  let maxC = 0;
  for (const cell of cells) {
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }

  const results: FastBoardMasks[] = [];
  for (let ar = 0; ar <= GRID_SIZE - 1 - maxR; ar++) {
    for (let ac = 0; ac <= GRID_SIZE - 1 - maxC; ac++) {
      let pieceLo = 0;
      let pieceHi = 0;
      let collision = false;

      for (let i = 0; i < cells.length; i++) {
        const r = ar + cells[i].r;
        const c = ac + cells[i].c;
        if (r < 4) {
          const bit = 1 << (r * 8 + c);
          if ((masks.occLo & bit) !== 0) {
            collision = true;
            break;
          }
          pieceLo |= bit;
        } else {
          const bit = 1 << ((r - 4) * 8 + c);
          if ((masks.occHi & bit) !== 0) {
            collision = true;
            break;
          }
          pieceHi |= bit;
        }
      }

      if (!collision) {
        results.push(applyMaskAndClear(masks, pieceLo, pieceHi));
      }
    }
  }
  return results;
}

function canPlacePieceListBacktrack(
  masks: FastBoardMasks,
  pieces: PieceInstance[],
  usedFlags: boolean[],
  remainingCount: number,
  rotationsBudget: number
): boolean {
  if (remainingCount === 0) return true;

  for (let i = 0; i < pieces.length; i++) {
    if (usedFlags[i]) continue;
    const piece = pieces[i];
    const orientations = getUniqueOrientations(piece.cells);

    for (const orient of orientations) {
      const cost = orient.steps;
      if (cost > rotationsBudget) continue;

      const nextMasks = getAllValidPlacementsMask(masks, orient.cells);
      if (nextMasks.length === 0) continue;

      usedFlags[i] = true;
      for (let m = 0; m < nextMasks.length; m++) {
        if (
          canPlacePieceListBacktrack(
            nextMasks[m],
            pieces,
            usedFlags,
            remainingCount - 1,
            rotationsBudget - cost
          )
        ) {
          usedFlags[i] = false;
          return true;
        }
      }
      usedFlags[i] = false;
    }
  }
  return false;
}

export function canSolveTray(
  grid: Grid8x8,
  trayPieces: PieceInstance[],
  pocketPiece: PieceInstance | null,
  rotateCharges: number,
  allowPocketUse = true
): boolean {
  const masks = gridToMasks(grid);

  if (
    canPlacePieceListBacktrack(
      masks,
      trayPieces,
      new Array(trayPieces.length).fill(false),
      trayPieces.length,
      rotateCharges
    )
  ) {
    return true;
  }

  if (!allowPocketUse || trayPieces.length <= 1) {
    return false;
  }

  if (pocketPiece === null) {
    for (let skipIdx = 0; skipIdx < trayPieces.length; skipIdx++) {
      const subset = trayPieces.filter((_, idx) => idx !== skipIdx);
      if (
        canPlacePieceListBacktrack(
          masks,
          subset,
          new Array(subset.length).fill(false),
          subset.length,
          rotateCharges
        )
      ) {
        return true;
      }
    }
  } else {
    for (let swapIdx = 0; swapIdx < trayPieces.length; swapIdx++) {
      const swappedSet = trayPieces.map((p, idx) =>
        idx === swapIdx ? pocketPiece : p
      );
      if (
        canPlacePieceListBacktrack(
          masks,
          swappedSet,
          new Array(swappedSet.length).fill(false),
          swappedSet.length,
          rotateCharges
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function canPlacePieceAnywhere(
  grid: Grid8x8,
  piece: PieceInstance,
  rotateCharges: number
): boolean {
  const masks = gridToMasks(grid);
  const orientations = getUniqueOrientations(piece.cells);
  for (const orient of orientations) {
    if (orient.steps > rotateCharges) continue;
    const placements = getAllValidPlacementsMask(masks, orient.cells);
    if (placements.length > 0) return true;
  }
  return false;
}

export function checkHasAnyPlayableMove(
  grid: Grid8x8,
  tray: (PieceInstance | null)[],
  pocketPiece: PieceInstance | null,
  rotateCharges: number,
  canParkLastPiece = true
): boolean {
  const activeTray = tray.filter((p): p is PieceInstance => p !== null);

  for (const piece of activeTray) {
    if (canPlacePieceAnywhere(grid, piece, rotateCharges)) {
      return true;
    }
  }

  if (pocketPiece && canPlacePieceAnywhere(grid, pocketPiece, rotateCharges)) {
    return true;
  }

  if (canParkLastPiece && pocketPiece === null && activeTray.length === 1) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) return true;
      }
    }
  }

  return false;
}

const DDA_FRIENDLY_SHAPE_IDS = new Set([
  'dot_1',
  'sq_2x2',
  'domino_h',
  'domino_v',
  'tri_h',
  'tri_v',
  'quad_h',
  'quad_v',
  'penta_h',
  'penta_v',
]);

export function getWeightedCatalog(
  occupancy: number,
  ddaBoost = false,
  zenTier?: number
): { shape: PolyominoShape; weight: number }[] {
  const highOccupancy = occupancy >= 0.65;
  const criticalOccupancy = occupancy >= 0.8;

  const classicWeighted = CLASSIC_POLYOMINO_CATALOG.map((shape) => {
    let weight = shape.baseWeight;
    if (criticalOccupancy) {
      if (shape.tier === 'tiny') weight *= 4.0;
      else if (shape.tier === 'small') weight *= 2.2;
      else if (shape.tier === 'medium') weight *= 0.45;
      else weight *= 0.1;
    } else if (highOccupancy) {
      if (shape.tier === 'tiny') weight *= 2.4;
      else if (shape.tier === 'small') weight *= 1.8;
      else if (shape.tier === 'large') weight *= 0.25;
    }

    // Silent DDA: after 2+ consecutive losses on a level, boost 1x1, 2x2, and straight lines by 25%
    if (ddaBoost && DDA_FRIENDLY_SHAPE_IDS.has(shape.id)) {
      weight *= 1.25;
    }
    return { shape, weight };
  });

  if (zenTier === undefined || zenTier < 1) {
    return classicWeighted;
  }

  const tierCfg = getTierConfig(zenTier);
  const unlockedPentominoes = ZEN_PENTOMINO_SHAPES.slice(0, tierCfg.tier);
  if (unlockedPentominoes.length === 0) {
    return classicWeighted;
  }

  let classicTotal = 0;
  for (const item of classicWeighted) {
    classicTotal += item.weight;
  }

  // Balance lock (arena/104b5d58): zen non-classic spawn share is half the
  // legacy tier config, so L1..L5 spawn at 10% / 15% / 20% / 25% / 30%
  // instead of the punishing 20% … 60% ramp.
  const targetShare = Math.max(0.01, Math.min(0.99, tierCfg.nonClassicWeight * 0.5));
  const totalNonClassicWeight =
    classicTotal * (targetShare / Math.max(0.01, 1 - targetShare));

  const rawUnits = unlockedPentominoes.map((shape) =>
    shape.id === tierCfg.shapeId ? 2 : 1
  );
  const totalUnits = rawUnits.reduce((acc, v) => acc + v, 0);

  const nonClassicWeighted = unlockedPentominoes.map((shape, idx) => ({
    shape,
    weight: (totalNonClassicWeight * rawUnits[idx]) / totalUnits,
  }));

  return [...classicWeighted, ...nonClassicWeighted];
}

function pickWeightedShape(
  weighted: { shape: PolyominoShape; weight: number }[],
  rng: SeededRng
): PolyominoShape {
  let total = 0;
  for (const item of weighted) total += item.weight;
  let roll = rng.next() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.shape;
  }
  return weighted[0].shape;
}

function pickMaterial(rng: SeededRng): MaterialType {
  const idx = Math.floor(rng.next() * ARTISAN_MATERIALS.length);
  return ARTISAN_MATERIALS[idx] ?? 'honey_oak';
}

export interface TrayGenerationOptions {
  allowedSpecials?: SpecialBlockType[];
  spawnAcornGems?: boolean;
  minAcornPieces?: number;
  specialChance?: number;
  ddaBoost?: boolean;
  mode?: GameMode;
  zenTier?: number;
}

function decorateTrayPieces(
  pieces: PieceInstance[],
  rng: SeededRng,
  options?: TrayGenerationOptions
): PieceInstance[] {
  const allowed = options?.allowedSpecials ?? [];
  const spawnAcorns = Boolean(options?.spawnAcornGems);
  const minAcornPieces = spawnAcorns
    ? Math.min(pieces.length, options?.minAcornPieces ?? 2)
    : 0;
  const specialChance = options?.specialChance ?? 0.55;

  if (allowed.length === 0 && !spawnAcorns) return pieces;

  // Deterministic special & acorn assignment using the seeded PRNG
  const specialSlot =
    allowed.length > 0 && rng.next() < specialChance
      ? Math.floor(rng.next() * pieces.length)
      : -1;
  const chosenSpecial =
    specialSlot >= 0
      ? allowed[Math.floor(rng.next() * allowed.length)]
      : undefined;

  const guaranteedAcornSlots = new Set<number>();
  if (spawnAcorns && pieces.length > 0 && minAcornPieces > 0) {
    const startOffset = Math.floor(rng.next() * pieces.length);
    for (let k = 0; k < minAcornPieces; k++) {
      guaranteedAcornSlots.add((startOffset + k) % pieces.length);
    }
  }

  return pieces.map((piece, idx) => {
    let specialCellIndex: number | undefined;
    let specialType: SpecialBlockType | undefined;
    let acornCellIndices: number[] | undefined;

    if (idx === specialSlot && chosenSpecial) {
      specialCellIndex = Math.floor(rng.next() * piece.cells.length);
      specialType = chosenSpecial;
    }

    if (
      spawnAcorns &&
      (guaranteedAcornSlots.has(idx) || rng.next() < 0.55)
    ) {
      const candidateIndices = piece.cells
        .map((_, ci) => ci)
        .filter((ci) => ci !== specialCellIndex);
      if (candidateIndices.length > 0) {
        const picked =
          candidateIndices[Math.floor(rng.next() * candidateIndices.length)];
        acornCellIndices = [picked];
      } else if (piece.cells.length > 0) {
        acornCellIndices = [0];
      }
    }

    return {
      ...piece,
      specialCellIndex,
      specialType,
      acornCellIndices,
    };
  });
}

function countEmptyCells(grid: Grid8x8): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) count++;
    }
  }
  return count;
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function countOpenPlacementsForTray(
  masks: FastBoardMasks,
  trayPieces: PieceInstance[],
  rotateCharges: number
): number {
  let totalPlacements = 0;
  for (let i = 0; i < trayPieces.length; i++) {
    const orientations = getUniqueOrientations(trayPieces[i].cells);
    for (const orient of orientations) {
      if (orient.steps > rotateCharges) continue;
      totalPlacements += getAllValidPlacementsMask(masks, orient.cells).length;
    }
  }
  return totalPlacements;
}

export function generateSolvableTray(
  grid: Grid8x8,
  pocketPiece: PieceInstance | null,
  rotateCharges: number,
  rng: SeededRng,
  options?: TrayGenerationOptions
): PieceInstance[] {
  const emptyCells = countEmptyCells(grid);
  if (emptyCells === 0) {
    return [];
  }

  const occupancy = getBoardOccupancy(grid);
  const isZen = options?.mode === 'zen' || options?.zenTier !== undefined;

  if (isZen) {
    const activeTierNum = options?.zenTier ?? getActiveTierState();
    const tierCfg = getTierConfig(activeTierNum);
    // Balance lock (arena/104b5d58): non-classic spawn share halves the legacy
    // tier config (L1 10% … L5 30%), and a tray carries at most one
    // non-classic pentomino so the other two slots stay classic and playable.
    const targetShare = Math.max(0.01, Math.min(0.99, tierCfg.nonClassicWeight * 0.5));
    const weighted = getWeightedCatalog(
      occupancy,
      Boolean(options?.ddaBoost),
      activeTierNum
    );
    const classicPool = weighted.filter(
      (item) => !NON_CLASSIC_SHAPE_IDS.has(item.shape.id)
    );
    const nonClassicPool = weighted.filter((item) =>
      NON_CLASSIC_SHAPE_IDS.has(item.shape.id)
    );
    const masks = gridToMasks(grid);
    const MAX_CANDIDATE_TRAYS = 6;
    const deadlineMs = nowMs() + 12;

    // Build one 3-piece candidate honoring the hard cap: maximum 1 non-classic
    // pentomino per tray, sitting in a uniformly random slot.
    const buildZenCandidate = (): PieceInstance[] => {
      const slots = [0, 1, 2];
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      const pieces: PieceInstance[] = [];
      const includeNonClassic =
        nonClassicPool.length > 0 && rng.next() < targetShare;
      const nonClassicSlot = includeNonClassic ? slots[0] : -1;
      for (const slot of slots) {
        pieces[slot] = createPieceInstance(
          pickWeightedShape(
            slot === nonClassicSlot ? nonClassicPool : classicPool,
            rng
          ),
          pickMaterial(rng)
        );
      }
      return pieces;
    };

    interface OpenTray {
      pieces: PieceInstance[];
      openPlacements: number;
    }
    const solvable: OpenTray[] = [];

    for (let attempt = 0; attempt < MAX_CANDIDATE_TRAYS; attempt++) {
      if (attempt > 0 && nowMs() >= deadlineMs) {
        break;
      }

      const candidate = buildZenCandidate();

      if (canSolveTray(grid, candidate, pocketPiece, rotateCharges, true)) {
        if (nowMs() >= deadlineMs) {
          return decorateTrayPieces(
            solvable.length > 0 ? solvable[0].pieces : candidate,
            rng,
            options
          );
        }
        solvable.push({
          pieces: candidate,
          openPlacements: countOpenPlacementsForTray(
            masks,
            candidate,
            rotateCharges
          ),
        });
        if (nowMs() >= deadlineMs) {
          break;
        }
      }
    }

    if (solvable.length > 0) {
      const tier = activeTierNum;
      let chosen: PieceInstance[];
      if (tier <= 2) {
        // L1 & L2 (0-2,499): normal fair solvable trays. Never tighten.
        chosen = solvable[0].pieces;
      } else if (tier === 3) {
        // L3 (2,500-4,499): moderate / median-openness solvable tray.
        const byOpenness = [...solvable].sort(
          (a, b) => a.openPlacements - b.openPlacements
        );
        chosen = byOpenness[Math.floor(byOpenness.length / 2)].pieces;
      } else {
        // L4 & L5 (4,500+): tightest tray on at most 40% of trays; a flow
        // tray otherwise so players keep breathing room to build combos.
        const tightest = solvable.reduce(
          (best, cur) =>
            cur.openPlacements < best.openPlacements ? cur : best,
          solvable[0]
        );
        chosen = rng.next() < 0.4 ? tightest.pieces : solvable[0].pieces;
      }
      return decorateTrayPieces(chosen, rng, options);
    }

    // Tight-Board Safety (NO False Game Over):
    // Fall back to smaller 1-3 cell pieces ensuring at least 1 piece is legally placeable if ANY cell is open.
    const smallFitting: PolyominoShape[] = [];
    for (const shape of CLASSIC_POLYOMINO_CATALOG) {
      if (shape.cells.length > 3) continue;
      const orientations = getUniqueOrientations(shape.cells);
      for (const orient of orientations) {
        if (orient.steps > rotateCharges) continue;
        if (getAllValidPlacementsMask(masks, orient.cells).length > 0) {
          smallFitting.push(shape);
          break;
        }
      }
    }

    smallFitting.sort((a, b) => a.cells.length - b.cells.length);
    const guaranteedPlaceable = smallFitting[0] ?? CLASSIC_POLYOMINO_CATALOG[0];
    const pool = smallFitting.length > 0 ? smallFitting : [guaranteedPlaceable];
    const trayCount = Math.min(3, Math.max(1, emptyCells));

    const fallbackCandidate = Array.from({ length: trayCount }, (_, idx) => {
      const pickedShape =
        idx === 0
          ? guaranteedPlaceable
          : pool[Math.floor(rng.next() * pool.length)] ?? guaranteedPlaceable;
      return createPieceInstance(pickedShape, pickMaterial(rng));
    });

    return decorateTrayPieces(fallbackCandidate, rng, options);
  }

  const weighted = getWeightedCatalog(occupancy, Boolean(options?.ddaBoost));

  for (let attempt = 0; attempt < 48; attempt++) {
    const candidate = [
      createPieceInstance(pickWeightedShape(weighted, rng), pickMaterial(rng)),
      createPieceInstance(pickWeightedShape(weighted, rng), pickMaterial(rng)),
      createPieceInstance(pickWeightedShape(weighted, rng), pickMaterial(rng)),
    ];

    const allowPocket = attempt >= 16;
    const allowedRotate = attempt >= 10 ? rotateCharges : 0;

    if (canSolveTray(grid, candidate, pocketPiece, allowedRotate, allowPocket)) {
      return decorateTrayPieces(candidate, rng, options);
    }
  }

  const masks = gridToMasks(grid);
  const fittingShapes: PolyominoShape[] = [];
  for (const shape of CLASSIC_POLYOMINO_CATALOG) {
    const orientations = getUniqueOrientations(shape.cells);
    let fits = false;
    for (const orient of orientations) {
      if (orient.steps > rotateCharges) continue;
      if (getAllValidPlacementsMask(masks, orient.cells).length > 0) {
        fits = true;
        break;
      }
    }
    if (fits) fittingShapes.push(shape);
  }

  fittingShapes.sort((a, b) => a.cells.length - b.cells.length);

  if (fittingShapes.length === 0) {
    return [];
  }

  const pool = fittingShapes.slice(0, Math.min(8, fittingShapes.length));
  for (let attempt = 0; attempt < 40; attempt++) {
    const s0 = pool[Math.floor(rng.next() * pool.length)];
    const s1 = pool[Math.floor(rng.next() * pool.length)];
    const s2 = pool[Math.floor(rng.next() * pool.length)];
    const candidate = [
      createPieceInstance(s0, pickMaterial(rng)),
      createPieceInstance(s1, pickMaterial(rng)),
      createPieceInstance(s2, pickMaterial(rng)),
    ];
    if (canSolveTray(grid, candidate, pocketPiece, rotateCharges, true)) {
      return decorateTrayPieces(candidate, rng, options);
    }
  }

  const smallest = fittingShapes[0];
  const guaranteedThree = [
    createPieceInstance(smallest, pickMaterial(rng)),
    createPieceInstance(smallest, pickMaterial(rng)),
    createPieceInstance(smallest, pickMaterial(rng)),
  ];
  if (
    emptyCells >= 3 &&
    canSolveTray(grid, guaranteedThree, pocketPiece, rotateCharges, true)
  ) {
    return decorateTrayPieces(guaranteedThree, rng, options);
  }

  // At 95%+ occupancy with fewer than 3 empty cells, never blindly return three 1x1 pebbles:
  // verify a smaller placeable subset (2 or 1) or return [] so the caller triggers Board Full / Garden Rescue.
  const dot = POLYOMINO_CATALOG[0];
  for (let count = Math.min(2, emptyCells); count >= 1; count--) {
    const subset = Array.from({ length: count }, () =>
      createPieceInstance(dot, pickMaterial(rng))
    );
    if (canSolveTray(grid, subset, pocketPiece, rotateCharges, false)) {
      return decorateTrayPieces(subset, rng, options);
    }
  }

  return [];
}

/**
 * Clears a 3x3 zone (preferring center rows 2..4, cols 2..4; or densest 3x3 area)
 * while preserving permanent 'blocked' architectural obstacles.
 */
export function applyReviveClear3x3(grid: Grid8x8): {
  nextGrid: Grid8x8;
  clearedCells: CellCoord[];
} {
  const nextGrid = cloneGrid(grid);
  const countInWindow = (startR: number, startC: number): number => {
    let count = 0;
    for (let r = startR; r < startR + 3; r++) {
      for (let c = startC; c < startC + 3; c++) {
        const cell = nextGrid[r][c];
        if (cell && cell.kind !== 'blocked') count++;
      }
    }
    return count;
  };

  let bestR = 2;
  let bestC = 2;
  let bestCount = countInWindow(2, 2);

  // If center 3x3 (e.g. Fountain Atrium) has < 3 clearable tiles, pick densest 3x3 window
  if (bestCount < 3) {
    for (let r = 0; r <= GRID_SIZE - 3; r++) {
      for (let c = 0; c <= GRID_SIZE - 3; c++) {
        const cnt = countInWindow(r, c);
        if (cnt > bestCount) {
          bestCount = cnt;
          bestR = r;
          bestC = c;
        }
      }
    }
  }

  const clearedCells: CellCoord[] = [];
  for (let r = bestR; r < bestR + 3; r++) {
    for (let c = bestC; c < bestC + 3; c++) {
      const cell = nextGrid[r][c];
      if (cell && cell.kind !== 'blocked') {
        nextGrid[r][c] = null;
        clearedCells.push({ r, c });
      }
    }
  }

  return { nextGrid, clearedCells };
}
