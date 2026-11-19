import {
  ARTISAN_MATERIALS,
  createPieceInstance,
  POLYOMINO_CATALOG,
  type SeededRng,
} from './shapes';
import {
  GRID_SIZE,
  type BoardShapeId,
  type CellCoord,
  type DifficultyTier,
  type Grid8x8,
  type LevelDefinition,
  type PieceInstance,
  type SpecialBlockType,
} from './types';

export const BOARD_SHAPE_META: Record<
  BoardShapeId,
  { name: string; description: string }
> = {
  courtyard: {
    name: 'Classic Courtyard',
    description: 'Open 8×8 sunlit patio grid',
  },
  bay_window: {
    name: 'Bay-Window Arch',
    description: 'Curved stone alcoves at the upper corners',
  },
  fountain_atrium: {
    name: 'Fountain Atrium',
    description: '2×2 stone courtyard fountain at center',
  },
  twin_garden: {
    name: 'Twin-Garden Bridge',
    description: 'Two 3-wide garden beds linked by a central bridge',
  },
};

export const SPECIAL_BLOCK_META: Record<
  SpecialBlockType,
  { label: string; shortLabel: string; description: string }
> = {
  amber_honey: {
    label: 'Amber Honey',
    shortLabel: 'Honey',
    description: 'Clears 4 adjacent neighbors & triggers Cascade chains',
  },
  bloom_seed: {
    label: 'Bloom-Seed',
    shortLabel: 'Bloom',
    description: 'Sprouts a flower that awards +1 Cozy Star when cleared',
  },
  lantern_glow: {
    label: 'Lantern Glow',
    shortLabel: 'Lantern',
    description: 'Doubles the combo score multiplier on clear',
  },
};

export const LEVEL1_HOOK_TARGET_CELLS: CellCoord[] = [
  { r: 3, c: 3 },
  { r: 3, c: 4 },
];

export function getLevelDifficultyMeta(level: LevelDefinition): {
  tier: DifficultyTier;
  badgeLabel: string | null;
  starMultiplier: number;
} {
  const tier: DifficultyTier = level.difficultyTier ?? 'standard';
  const starMultiplier = level.starMultiplier ?? (tier === 'master_trial' ? 2 : 1);
  if (tier === 'master_trial') {
    return {
      tier,
      badgeLabel: 'Master Artisan Trial · 2× ★',
      starMultiplier,
    };
  }
  if (tier === 'bonus_bloom') {
    return {
      tier,
      badgeLabel: 'Bonus Bloom · Relaxing',
      starMultiplier,
    };
  }
  return { tier, badgeLabel: null, starMultiplier };
}

export function getBlockedCoordsForShape(shape: BoardShapeId): CellCoord[] {
  if (shape === 'courtyard') {
    return [];
  }

  if (shape === 'bay_window') {
    return [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 0, c: 6 },
      { r: 0, c: 7 },
      { r: 1, c: 7 },
    ];
  }

  if (shape === 'fountain_atrium') {
    return [
      { r: 3, c: 3 },
      { r: 3, c: 4 },
      { r: 4, c: 3 },
      { r: 4, c: 4 },
    ];
  }

  // twin_garden: two 3x6 garden plots (cols 0..2 & 5..7, rows 1..6) joined by 2x2 middle bridge (rows 3..4, cols 3..4)
  const blocked: CellCoord[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isTopOrBottomBorder = r === 0 || r === 7;
      const isStreamGap = (c === 3 || c === 4) && !(r === 3 || r === 4);
      if (isTopOrBottomBorder || isStreamGap) {
        blocked.push({ r, c });
      }
    }
  }
  return blocked;
}

const STORY_LEVELS: LevelDefinition[] = [
  {
    levelNumber: 1,
    title: 'Attic Sunbeam',
    subtitle: 'Drop the 1×2 timber piece into the glowing gap for an instant 2-line clear',
    boardShape: 'courtyard',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'score', target: 850, label: 'Reach 850 Score' },
    allowedSpecials: ['amber_honey'],
    initialMossCoords: [],
    initialAcornCoords: [],
    starThresholds: [850, 1250, 1750],
  },
  {
    levelNumber: 2,
    title: 'Bay-Window Alcove',
    subtitle: 'Harvest Acorn Gems around the curved window sills',
    boardShape: 'bay_window',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'acorn_gems', target: 8, label: 'Collect 8 Acorn Gems' },
    allowedSpecials: ['amber_honey', 'bloom_seed'],
    initialMossCoords: [],
    initialAcornCoords: [
      { r: 2, c: 2 },
      { r: 2, c: 5 },
      { r: 5, c: 2 },
      { r: 5, c: 5 },
    ],
    starThresholds: [700, 1150, 1650],
  },
  {
    levelNumber: 3,
    title: 'Stone Fountain Atrium',
    subtitle: 'Clear overgrown moss circling the courtyard basin',
    boardShape: 'fountain_atrium',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'clear_moss', target: 6, label: 'Clear 6 Moss Tiles' },
    allowedSpecials: ['amber_honey', 'lantern_glow'],
    initialMossCoords: [
      { r: 2, c: 3 },
      { r: 2, c: 4 },
      { r: 5, c: 3 },
      { r: 5, c: 4 },
      { r: 3, c: 2 },
      { r: 4, c: 5 },
    ],
    initialAcornCoords: [],
    starThresholds: [800, 1300, 1850],
  },
  {
    levelNumber: 4,
    title: 'Twin-Garden Bridge',
    subtitle: 'Link both garden beds across the central timber bridge',
    boardShape: 'twin_garden',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'score', target: 1200, label: 'Reach 1,200 Score' },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: [],
    initialAcornCoords: [],
    starThresholds: [1200, 1700, 2300],
  },
  {
    levelNumber: 5,
    title: 'Mossy Bay-Window Trial',
    subtitle: 'Master Artisan Trial · Double Cozy Stars for clearing stubborn moss',
    boardShape: 'bay_window',
    difficultyTier: 'master_trial',
    starMultiplier: 2,
    goal: { type: 'clear_moss', target: 8, label: 'Clear 8 Moss Tiles' },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: [
      { r: 1, c: 3 },
      { r: 1, c: 4 },
      { r: 3, c: 1 },
      { r: 3, c: 6 },
      { r: 4, c: 1 },
      { r: 4, c: 6 },
      { r: 6, c: 3 },
      { r: 6, c: 4 },
    ],
    initialAcornCoords: [],
    starThresholds: [950, 1450, 2050],
  },
  {
    levelNumber: 6,
    title: 'Atrium Bonus Bloom',
    subtitle: 'Relaxing garden breather · Extra Bloom-Seeds & gentle Acorn goal',
    boardShape: 'fountain_atrium',
    difficultyTier: 'bonus_bloom',
    starMultiplier: 1,
    goal: { type: 'acorn_gems', target: 8, label: 'Collect 8 Acorn Gems' },
    allowedSpecials: ['bloom_seed', 'amber_honey', 'lantern_glow'],
    initialMossCoords: [],
    initialAcornCoords: [
      { r: 1, c: 1 },
      { r: 1, c: 6 },
      { r: 6, c: 1 },
      { r: 6, c: 6 },
      { r: 2, c: 4 },
      { r: 5, c: 3 },
    ],
    starThresholds: [900, 1400, 1950],
  },
  {
    levelNumber: 7,
    title: 'Overgrown Crossing',
    subtitle: 'Clear 8 Moss Tiles guarding the Twin-Garden Bridge',
    boardShape: 'twin_garden',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'clear_moss', target: 8, label: 'Clear 8 Moss Tiles' },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: [
      { r: 2, c: 1 },
      { r: 2, c: 6 },
      { r: 3, c: 2 },
      { r: 3, c: 5 },
      { r: 4, c: 2 },
      { r: 4, c: 5 },
      { r: 5, c: 1 },
      { r: 5, c: 6 },
    ],
    initialAcornCoords: [],
    starThresholds: [1050, 1550, 2150],
  },
  {
    levelNumber: 8,
    title: 'Grand Courtyard',
    subtitle: 'Chain Lantern multipliers to reach 1,800 Score',
    boardShape: 'courtyard',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: { type: 'score', target: 1800, label: 'Reach 1,800 Score' },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: [
      { r: 3, c: 3 },
      { r: 4, c: 4 },
    ],
    initialAcornCoords: [],
    starThresholds: [1800, 2500, 3300],
  },
];

export function getLevelDefinition(levelNumber: number): LevelDefinition {
  if (levelNumber <= STORY_LEVELS.length) {
    return STORY_LEVELS[Math.max(0, levelNumber - 1)];
  }

  // Sawtooth Story scaling for Level 9+
  const isMasterTrial = levelNumber % 5 === 0;
  const isBonusBloom = levelNumber > 1 && (levelNumber - 1) % 5 === 0;
  const difficultyTier: DifficultyTier = isMasterTrial
    ? 'master_trial'
    : isBonusBloom
      ? 'bonus_bloom'
      : 'standard';
  const starMultiplier = isMasterTrial ? 2 : 1;

  const shapes: BoardShapeId[] = [
    'bay_window',
    'fountain_atrium',
    'twin_garden',
    'courtyard',
  ];
  const boardShape = isBonusBloom
    ? 'courtyard'
    : shapes[(levelNumber - 1) % shapes.length];
  const cycleIdx = isBonusBloom ? 1 : (levelNumber - 1) % 3;
  const baseScore = 1600 + (levelNumber - 8) * 320;
  const targetScore = isMasterTrial
    ? Math.round(baseScore * 1.15)
    : isBonusBloom
      ? Math.round(baseScore * 0.75)
      : baseScore;

  if (cycleIdx === 0) {
    return {
      levelNumber,
      title: isMasterTrial
        ? `Master Atelier Trial ${levelNumber}`
        : `Garden Atelier ${levelNumber}`,
      subtitle: isMasterTrial
        ? 'Master Artisan Trial · Double Cozy Stars & high-combo board'
        : 'Master combo multipliers & special tiles',
      boardShape,
      difficultyTier,
      starMultiplier,
      goal: {
        type: 'score',
        target: targetScore,
        label: `Reach ${targetScore.toLocaleString()} Score`,
      },
      allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
      initialMossCoords: isMasterTrial
        ? [
            { r: 2, c: 2 },
            { r: 2, c: 5 },
            { r: 5, c: 2 },
            { r: 5, c: 5 },
          ]
        : [],
      initialAcornCoords: [],
      starThresholds: [
        targetScore,
        Math.round(targetScore * 1.35),
        Math.round(targetScore * 1.75),
      ],
    };
  }

  if (cycleIdx === 1) {
    const targetGems = isBonusBloom
      ? 8
      : Math.min(18, 10 + Math.floor((levelNumber - 6) / 2) * 2);
    return {
      levelNumber,
      title: isBonusBloom
        ? `Bonus Bloom Sanctuary ${levelNumber}`
        : isMasterTrial
          ? `Master Grove Trial ${levelNumber}`
          : `Acorn Grove ${levelNumber}`,
      subtitle: isBonusBloom
        ? 'Relaxing Bonus Bloom · Extra Bloom-Seeds & calming pacing'
        : isMasterTrial
          ? 'Master Artisan Trial · Earn 2× Cozy Stars!'
          : 'Harvest sparkling Acorn Gems across the layout',
      boardShape,
      difficultyTier,
      starMultiplier,
      goal: {
        type: 'acorn_gems',
        target: targetGems,
        label: `Collect ${targetGems} Acorn Gems`,
      },
      allowedSpecials: ['bloom_seed', 'amber_honey', 'lantern_glow'],
      initialMossCoords: [],
      initialAcornCoords: [
        { r: 2, c: 1 },
        { r: 2, c: 6 },
        { r: 5, c: 1 },
        { r: 5, c: 6 },
      ],
      starThresholds: isBonusBloom ? [850, 1300, 1850] : [1200, 1800, 2500],
    };
  }

  const mossCandidates: CellCoord[] = [
    { r: 2, c: 2 },
    { r: 2, c: 5 },
    { r: 3, c: 1 },
    { r: 3, c: 6 },
    { r: 4, c: 1 },
    { r: 4, c: 6 },
    { r: 5, c: 2 },
    { r: 5, c: 5 },
  ];
  return {
    levelNumber,
    title: isMasterTrial
      ? `Master Moss Trial ${levelNumber}`
      : `Moss Sanctuary ${levelNumber}`,
    subtitle: isMasterTrial
      ? 'Master Artisan Trial · Double Cozy Stars on clear!'
      : 'Clear all overgrown moss tiles',
    boardShape,
    difficultyTier,
    starMultiplier,
    goal: {
      type: 'clear_moss',
      target: mossCandidates.length,
      label: `Clear ${mossCandidates.length} Moss Tiles`,
    },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: mossCandidates,
    initialAcornCoords: [],
    starThresholds: [1100, 1700, 2400],
  };
}

/**
 * Curated Level 1 opening tray so the player's very first drag of slot 0 (Bar 1x2)
 * triggers an instant 2-line combo clear (Row 3 + Col 4) within 4 seconds.
 */
export function createLevel1OpeningTray(): PieceInstance[] {
  const byId = (id: string) =>
    POLYOMINO_CATALOG.find((s) => s.id === id) ?? POLYOMINO_CATALOG[0];

  return [
    createPieceInstance(byId('domino_h'), 'honey_oak', 'lv1_hook_bar', {
      specialCellIndex: 1,
      specialType: 'amber_honey',
    }),
    createPieceInstance(byId('tri_l1'), 'glazed_ceramic', 'lv1_hook_corner'),
    createPieceInstance(byId('sq_2x2'), 'sea_glass', 'lv1_hook_sq'),
  ];
}

/**
 * Deterministic opening tray for Level 2 ("Collect 8 Acorn Gems"):
 * 4 initial Acorn Gems sit on the Bay-Window board, and all 3 opening tray
 * pieces carry an Acorn Gem so the player can reliably reach 8+ gems deterministically.
 */
export function createLevel2OpeningTray(): PieceInstance[] {
  const byId = (id: string) =>
    POLYOMINO_CATALOG.find((s) => s.id === id) ?? POLYOMINO_CATALOG[0];

  return [
    createPieceInstance(byId('tri_h'), 'honey_oak', 'lv2_acorn_0', {
      acornCellIndices: [1],
    }),
    createPieceInstance(byId('sq_2x2'), 'glazed_ceramic', 'lv2_acorn_1', {
      acornCellIndices: [0],
      specialCellIndex: 3,
      specialType: 'amber_honey',
    }),
    createPieceInstance(byId('domino_v'), 'woven_rattan', 'lv2_acorn_2', {
      acornCellIndices: [0],
    }),
  ];
}

export function getLevelTrayOptions(
  levelDef: LevelDefinition,
  ddaBoost = false
): {
  allowedSpecials: SpecialBlockType[];
  spawnAcornGems: boolean;
  minAcornPieces: number;
  specialChance: number;
  ddaBoost: boolean;
} {
  return {
    allowedSpecials: levelDef.allowedSpecials,
    spawnAcornGems: levelDef.goal.type === 'acorn_gems',
    minAcornPieces: levelDef.goal.type === 'acorn_gems' ? 2 : 0,
    specialChance: levelDef.allowedSpecials.length > 0 ? 0.6 : 0,
    ddaBoost,
  };
}

function wouldCompleteLine(grid: Grid8x8, row: number, col: number): boolean {
  let rowFull = true;
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c === col) continue;
    if (grid[row][c] === null) {
      rowFull = false;
      break;
    }
  }
  if (rowFull) return true;

  let colFull = true;
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r === row) continue;
    if (grid[r][col] === null) {
      colFull = false;
      break;
    }
  }
  return colFull;
}

/**
 * Firefly Lantern Win-Streak (1..5):
 * Pre-spawns 1 (streak 1–2) or 2 (streak 3–5) bonus special tiles
 * (Amber Honey or Lantern Glow) at the start of the next Story level.
 */
export function preSpawnWinStreakSpecials(
  grid: Grid8x8,
  fireflyStreak: number,
  rng: SeededRng,
  isLevel1Curated = false
): number {
  if (fireflyStreak <= 0) return 0;
  const targetCount = fireflyStreak >= 3 ? 2 : 1;
  const pool: SpecialBlockType[] = ['amber_honey', 'lantern_glow'];
  let spawned = 0;

  if (isLevel1Curated) {
    // Imbue existing tiles on Row 3 / Col 4 without touching the (3,3)/(3,4) opening hook gap
    const existingCandidates: CellCoord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = grid[r][c];
        if (cell && cell.kind === 'tile' && !cell.special) {
          existingCandidates.push({ r, c });
        }
      }
    }
    while (spawned < targetCount && existingCandidates.length > 0) {
      const idx = Math.floor(rng.next() * existingCandidates.length);
      const coord = existingCandidates.splice(idx, 1)[0];
      const cell = grid[coord.r][coord.c];
      if (cell) {
        const specialType = pool[Math.floor(rng.next() * pool.length)] ?? 'amber_honey';
        grid[coord.r][coord.c] = { ...cell, special: specialType };
        spawned++;
      }
    }
    return spawned;
  }

  const emptySafe: CellCoord[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null && !wouldCompleteLine(grid, r, c)) {
        emptySafe.push({ r, c });
      }
    }
  }

  while (spawned < targetCount && emptySafe.length > 0) {
    const pickIdx = Math.floor(rng.next() * emptySafe.length);
    const chosen = emptySafe.splice(pickIdx, 1)[0];
    if (wouldCompleteLine(grid, chosen.r, chosen.c)) continue;
    const specialType = pool[Math.floor(rng.next() * pool.length)] ?? 'amber_honey';
    const mat =
      ARTISAN_MATERIALS[Math.floor(rng.next() * ARTISAN_MATERIALS.length)] ??
      'honey_oak';
    grid[chosen.r][chosen.c] = {
      kind: 'tile',
      material: mat,
      uid: `streak_${chosen.r}_${chosen.c}_${spawned}`,
      special: specialType,
    };
    spawned++;
  }

  return spawned;
}

export function buildGridFromLevel(
  level: LevelDefinition,
  rng: SeededRng,
  fireflyStreak = 0
): Grid8x8 {
  const grid: Grid8x8 = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );

  // Curated 4-Second First-Move Hook for Story Level 1:
  // Row 3 has 6/8 tiles (missing cols 3 & 4) and Col 4 has 7/8 tiles (missing row 3).
  // Placing the opening 1x2 Bar at (3,3) immediately triggers a 2-line combo clear!
  if (level.levelNumber === 1) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c === 3 || c === 4) continue;
      grid[3][c] = {
        kind: 'tile',
        material: c % 2 === 0 ? 'honey_oak' : 'woven_rattan',
        uid: `lv1_r3_${c}`,
      };
    }
    for (let r = 0; r < GRID_SIZE; r++) {
      if (r === 3) continue;
      grid[r][4] = {
        kind: 'tile',
        material: r % 2 === 0 ? 'glazed_ceramic' : 'sea_glass',
        uid: `lv1_c4_${r}`,
      };
    }
    if (fireflyStreak > 0) {
      preSpawnWinStreakSpecials(grid, fireflyStreak, rng, true);
    }
    return grid;
  }

  const blocked = getBlockedCoordsForShape(level.boardShape);
  for (const coord of blocked) {
    grid[coord.r][coord.c] = {
      kind: 'blocked',
      material: 'honey_oak',
      uid: `blk_${coord.r}_${coord.c}`,
    };
  }

  for (const coord of level.initialMossCoords) {
    if (grid[coord.r][coord.c] === null) {
      grid[coord.r][coord.c] = {
        kind: 'moss',
        material: 'glazed_ceramic',
        uid: `moss_${coord.r}_${coord.c}`,
      };
    }
  }

  for (const coord of level.initialAcornCoords) {
    if (grid[coord.r][coord.c] === null) {
      const mat =
        ARTISAN_MATERIALS[Math.floor(rng.next() * ARTISAN_MATERIALS.length)] ??
        'honey_oak';
      grid[coord.r][coord.c] = {
        kind: 'tile',
        material: mat,
        uid: `acorn_${coord.r}_${coord.c}`,
        hasAcornGem: true,
      };
    }
  }

  if (level.levelNumber > 0 && fireflyStreak > 0) {
    preSpawnWinStreakSpecials(grid, fireflyStreak, rng, false);
  }

  return grid;
}

/**
 * Deterministically picks a board shape & interactive setup for Same-Seed Friend Duel
 * so two players entering the same seed code (e.g. HAVEN-84) receive the exact same board + pieces.
 */
export function createDuelDefinition(rng: SeededRng): LevelDefinition {
  const shapes: BoardShapeId[] = [
    'courtyard',
    'bay_window',
    'fountain_atrium',
    'twin_garden',
  ];
  const boardShape = shapes[Math.floor(rng.next() * shapes.length)] ?? 'courtyard';

  return {
    levelNumber: 0,
    title: `Friend Duel · ${BOARD_SHAPE_META[boardShape].name}`,
    subtitle: 'Identical layout & piece sequence for both players',
    boardShape,
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: {
      type: 'score',
      target: 1500,
      label: 'Outscore Your Friend (Target 1,500+)',
    },
    allowedSpecials: ['amber_honey', 'bloom_seed', 'lantern_glow'],
    initialMossCoords: [],
    initialAcornCoords: [],
    starThresholds: [1000, 1500, 2200],
  };
}

export function createZenDefinition(): LevelDefinition {
  return {
    levelNumber: 0,
    title: 'Endless Zen Courtyard',
    subtitle: 'Stress-free 8×8 high-score chase',
    boardShape: 'courtyard',
    difficultyTier: 'standard',
    starMultiplier: 1,
    goal: {
      type: 'score',
      target: 2000,
      label: 'Endless High Score',
    },
    allowedSpecials: [],
    initialMossCoords: [],
    initialAcornCoords: [],
    starThresholds: [1000, 2000, 3500],
  };
}

