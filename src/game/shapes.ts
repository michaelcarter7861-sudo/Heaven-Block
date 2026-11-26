import type {
  CellCoord,
  GameMode,
  MaterialType,
  PieceInstance,
  PolyominoShape,
  SpecialBlockType,
} from './types';

export const ARTISAN_MATERIALS: MaterialType[] = [
  'honey_oak',
  'glazed_ceramic',
  'sea_glass',
  'woven_rattan',
];

export const MATERIAL_META: Record<
  MaterialType,
  { label: string; shortLabel: string; chapter: string }
> = {
  honey_oak: {
    label: 'Honey-Oak Wood',
    shortLabel: 'Honey-Oak',
    chapter: 'Attic Studio',
  },
  glazed_ceramic: {
    label: 'Glazed Ceramic',
    shortLabel: 'Ceramic',
    chapter: 'Greenhouse',
  },
  sea_glass: {
    label: 'Sea-Glass Amber',
    shortLabel: 'Sea-Glass',
    chapter: 'Lakeside Café',
  },
  woven_rattan: {
    label: 'Woven Rattan',
    shortLabel: 'Rattan',
    chapter: 'Kyoto Courtyard',
  },
};

export type LevelTierNumber = 1 | 2 | 3 | 4 | 5;

export interface MaterialColorPair {
  colorHex: string;
  accentHex: string;
}

export interface LevelTierConfig {
  tier: LevelTierNumber;
  id: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  label: string;
  name: string;
  minScore: number;
  maxScore: number;
  nonClassicWeight: number;
  accentHex: string;
  shapeId: string;
  unlockedShapeIds: string[];
  colors: Record<MaterialType, string>;
  palette: Record<MaterialType, MaterialColorPair>;
}

export const LEVEL_TIERS: readonly LevelTierConfig[] = [
  {
    tier: 1,
    id: 'L1',
    label: 'LVL 1',
    name: 'Amber Cobalt',
    minScore: 0,
    maxScore: 999,
    nonClassicWeight: 0.2,
    accentHex: '#38BDF8',
    shapeId: 'c_arch',
    unlockedShapeIds: ['c_arch'],
    colors: {
      honey_oak: '#F5B731',
      glazed_ceramic: '#22D3EE',
      sea_glass: '#34D399',
      woven_rattan: '#F59E0B',
    },
    palette: {
      honey_oak: { colorHex: '#F5B731', accentHex: '#FDE68A' },
      glazed_ceramic: { colorHex: '#22D3EE', accentHex: '#A5F3FC' },
      sea_glass: { colorHex: '#34D399', accentHex: '#A7F3D0' },
      woven_rattan: { colorHex: '#F59E0B', accentHex: '#38BDF8' },
    },
  },
  {
    tier: 2,
    id: 'L2',
    label: 'LVL 2',
    name: 'Coral Teal',
    minScore: 1000,
    maxScore: 2499,
    nonClassicWeight: 0.3,
    accentHex: '#67E8F9',
    shapeId: 'plus_cross',
    unlockedShapeIds: ['c_arch', 'plus_cross'],
    colors: {
      honey_oak: '#FF6B6B',
      glazed_ceramic: '#2DD4BF',
      sea_glass: '#A3E635',
      woven_rattan: '#FB923C',
    },
    palette: {
      honey_oak: { colorHex: '#FF6B6B', accentHex: '#FECDD3' },
      glazed_ceramic: { colorHex: '#2DD4BF', accentHex: '#99F6E4' },
      sea_glass: { colorHex: '#A3E635', accentHex: '#D9F99D' },
      woven_rattan: { colorHex: '#FB923C', accentHex: '#67E8F9' },
    },
  },
  {
    tier: 3,
    id: 'L3',
    label: 'LVL 3',
    name: 'Orchid Citrine',
    minScore: 2500,
    maxScore: 4499,
    nonClassicWeight: 0.4,
    accentHex: '#FBBF24',
    shapeId: 'stair_w',
    unlockedShapeIds: ['c_arch', 'plus_cross', 'stair_w'],
    colors: {
      honey_oak: '#EC4899',
      glazed_ceramic: '#FACC15',
      sea_glass: '#38BDF8',
      woven_rattan: '#C084FC',
    },
    palette: {
      honey_oak: { colorHex: '#EC4899', accentHex: '#FBCFE8' },
      glazed_ceramic: { colorHex: '#FACC15', accentHex: '#FEF08A' },
      sea_glass: { colorHex: '#38BDF8', accentHex: '#BAE6FD' },
      woven_rattan: { colorHex: '#C084FC', accentHex: '#FBBF24' },
    },
  },
  {
    tier: 4,
    id: 'L4',
    label: 'LVL 4',
    name: 'Crimson Ice',
    minScore: 4500,
    maxScore: 6999,
    nonClassicWeight: 0.5,
    accentHex: '#22D3EE',
    shapeId: 't_fork',
    unlockedShapeIds: ['c_arch', 'plus_cross', 'stair_w', 't_fork'],
    colors: {
      honey_oak: '#F43F5E',
      glazed_ceramic: '#7DD3FC',
      sea_glass: '#FB923C',
      woven_rattan: '#FB7185',
    },
    palette: {
      honey_oak: { colorHex: '#F43F5E', accentHex: '#FECDD3' },
      glazed_ceramic: { colorHex: '#7DD3FC', accentHex: '#E0F2FE' },
      sea_glass: { colorHex: '#FB923C', accentHex: '#FED7AA' },
      woven_rattan: { colorHex: '#FB7185', accentHex: '#22D3EE' },
    },
  },
  {
    tier: 5,
    id: 'L5',
    label: 'LVL 5',
    name: 'Solar Violet',
    minScore: 7000,
    maxScore: Infinity,
    nonClassicWeight: 0.6,
    accentHex: '#818CF8',
    shapeId: 'z_bolt',
    unlockedShapeIds: ['c_arch', 'plus_cross', 'stair_w', 't_fork', 'z_bolt'],
    colors: {
      honey_oak: '#F97316',
      glazed_ceramic: '#A855F7',
      sea_glass: '#A3E635',
      woven_rattan: '#FBBF24',
    },
    palette: {
      honey_oak: { colorHex: '#F97316', accentHex: '#FED7AA' },
      glazed_ceramic: { colorHex: '#A855F7', accentHex: '#E9D5FF' },
      sea_glass: { colorHex: '#A3E635', accentHex: '#ECFCCB' },
      woven_rattan: { colorHex: '#FBBF24', accentHex: '#818CF8' },
    },
  },
];

let activeTierState: LevelTierNumber = 1;

export function setActiveTierState(tier: number): void {
  const clamped = Math.max(1, Math.min(5, Math.floor(tier || 1))) as LevelTierNumber;
  activeTierState = clamped;
}

export function getActiveTierState(): LevelTierNumber {
  return activeTierState;
}

export function getActiveTier(
  mode: GameMode,
  score: number,
  stageIndex?: number
): LevelTierConfig {
  if (mode === 'zen') {
    const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
    if (safeScore >= 7000) return LEVEL_TIERS[4];
    if (safeScore >= 4500) return LEVEL_TIERS[3];
    if (safeScore >= 2500) return LEVEL_TIERS[2];
    if (safeScore >= 1000) return LEVEL_TIERS[1];
    return LEVEL_TIERS[0];
  }

  if (mode === 'story') {
    if (typeof stageIndex === 'number' && Number.isFinite(stageIndex) && stageIndex >= 1) {
      const idx = Math.max(1, Math.min(5, Math.floor(stageIndex))) - 1;
      return LEVEL_TIERS[idx] ?? LEVEL_TIERS[0];
    }
    return LEVEL_TIERS[0];
  }

  return LEVEL_TIERS[0];
}

export function getTierConfig(tier?: number | LevelTierConfig): LevelTierConfig {
  if (typeof tier === 'object' && tier !== null) {
    return tier;
  }
  const num = typeof tier === 'number' && Number.isFinite(tier) ? tier : activeTierState;
  const idx = Math.max(1, Math.min(5, Math.floor(num))) - 1;
  return LEVEL_TIERS[idx] ?? LEVEL_TIERS[0];
}

export function getMaterialColor(
  material: MaterialType,
  tier?: number | LevelTierConfig
): MaterialColorPair {
  const cfg = getTierConfig(tier);
  return cfg.palette[material] ?? cfg.palette.honey_oak;
}

export function getMaterialHex(
  material: MaterialType,
  tier?: number | LevelTierConfig
): string {
  return getMaterialColor(material, tier).colorHex;
}

function c(coords: [number, number][]): CellCoord[] {
  return coords.map(([r, col]) => ({ r, c: col }));
}

export const CLASSIC_POLYOMINO_CATALOG: PolyominoShape[] = [
  // Tiny (1-2 cells)
  { id: 'dot_1', name: 'Pebble 1×1', cells: c([[0, 0]]), tier: 'tiny', baseWeight: 6 },
  { id: 'domino_h', name: 'Bar 1×2', cells: c([[0, 0], [0, 1]]), tier: 'tiny', baseWeight: 10 },
  { id: 'domino_v', name: 'Pillar 2×1', cells: c([[0, 0], [1, 0]]), tier: 'tiny', baseWeight: 10 },

  // Small (3 cells)
  { id: 'tri_h', name: 'Beam 1×3', cells: c([[0, 0], [0, 1], [0, 2]]), tier: 'small', baseWeight: 12 },
  { id: 'tri_v', name: 'Post 3×1', cells: c([[0, 0], [1, 0], [2, 0]]), tier: 'small', baseWeight: 12 },
  { id: 'tri_l1', name: 'Corner L', cells: c([[0, 0], [1, 0], [1, 1]]), tier: 'small', baseWeight: 11 },
  { id: 'tri_l2', name: 'Corner J', cells: c([[0, 1], [1, 0], [1, 1]]), tier: 'small', baseWeight: 11 },
  { id: 'tri_l3', name: 'Corner ⌜', cells: c([[0, 0], [0, 1], [1, 0]]), tier: 'small', baseWeight: 11 },
  { id: 'tri_l4', name: 'Corner ⌝', cells: c([[0, 0], [0, 1], [1, 1]]), tier: 'small', baseWeight: 11 },

  // Medium (4 cells)
  { id: 'sq_2x2', name: 'Square 2×2', cells: c([[0, 0], [0, 1], [1, 0], [1, 1]]), tier: 'medium', baseWeight: 14 },
  { id: 'quad_h', name: 'Plank 1×4', cells: c([[0, 0], [0, 1], [0, 2], [0, 3]]), tier: 'medium', baseWeight: 9 },
  { id: 'quad_v', name: 'Column 4×1', cells: c([[0, 0], [1, 0], [2, 0], [3, 0]]), tier: 'medium', baseWeight: 9 },
  { id: 'l4_1', name: 'Sconce L', cells: c([[0, 0], [1, 0], [2, 0], [2, 1]]), tier: 'medium', baseWeight: 9 },
  { id: 'l4_2', name: 'Sconce J', cells: c([[0, 1], [1, 1], [2, 0], [2, 1]]), tier: 'medium', baseWeight: 9 },
  { id: 'l4_3', name: 'Shelf ⌈', cells: c([[0, 0], [0, 1], [0, 2], [1, 0]]), tier: 'medium', baseWeight: 8 },
  { id: 'l4_4', name: 'Shelf ⌉', cells: c([[0, 0], [0, 1], [0, 2], [1, 2]]), tier: 'medium', baseWeight: 8 },
  { id: 't4_down', name: 'Trellis T', cells: c([[0, 0], [0, 1], [0, 2], [1, 1]]), tier: 'medium', baseWeight: 8 },
  { id: 't4_up', name: 'Trellis ⊥', cells: c([[0, 1], [1, 0], [1, 1], [1, 2]]), tier: 'medium', baseWeight: 8 },
  { id: 'z4_1', name: 'Steps Z', cells: c([[0, 0], [0, 1], [1, 1], [1, 2]]), tier: 'medium', baseWeight: 7 },
  { id: 's4_1', name: 'Steps S', cells: c([[0, 1], [0, 2], [1, 0], [1, 1]]), tier: 'medium', baseWeight: 7 },

  // Large (5-9 cells)
  { id: 'penta_h', name: 'Beam 1×5', cells: c([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]), tier: 'large', baseWeight: 5 },
  { id: 'penta_v', name: 'Spire 5×1', cells: c([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]), tier: 'large', baseWeight: 5 },
  { id: 'big_l1', name: 'Arch 3×3 L', cells: c([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]), tier: 'large', baseWeight: 6 },
  { id: 'big_l2', name: 'Arch 3×3 ⌟', cells: c([[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]]), tier: 'large', baseWeight: 6 },
  { id: 'big_l3', name: 'Arch 3×3 ⌜', cells: c([[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]), tier: 'large', baseWeight: 6 },
  { id: 'big_l4', name: 'Arch 3×3 ⌝', cells: c([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]), tier: 'large', baseWeight: 6 },
  { id: 'rect_2x3', name: 'Patio 2×3', cells: c([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]), tier: 'large', baseWeight: 4 },
  { id: 'rect_3x2', name: 'Patio 3×2', cells: c([[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]]), tier: 'large', baseWeight: 4 },
  { id: 'sq_3x3', name: 'Courtyard 3×3', cells: c([
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ]), tier: 'large', baseWeight: 3 },
];

// 5 distinct non-Block-Blast pentomino shapes (max 5 cells, 3x2 or 3x3 bounding box, unlocked per tier L1..L5 in zen)
export const ZEN_PENTOMINO_SHAPES: PolyominoShape[] = [
  // L1: C-Arch (5 cells: 3-cell top bar + 1-cell legs on both ends)
  { id: 'c_arch', name: 'C-Arch', cells: c([[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]]), tier: 'large', baseWeight: 7 },
  // L2: Plus-Cross (5 cells: center + N/S/E/W)
  { id: 'plus_cross', name: 'Plus-Cross', cells: c([[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]), tier: 'large', baseWeight: 7 },
  // L3: Stair-W (5 cells: 3x3 diagonal W staircase)
  { id: 'stair_w', name: 'Stair-W', cells: c([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]), tier: 'large', baseWeight: 7 },
  // L4: T-Fork (5 cells: 3-cell top bar + 2-cell center stem)
  { id: 't_fork', name: 'T-Fork', cells: c([[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]), tier: 'large', baseWeight: 7 },
  // L5: Z-Bolt (5 cells: 2-cell top-left, 1 center, 2-cell bottom-right)
  { id: 'z_bolt', name: 'Z-Bolt', cells: c([[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]]), tier: 'large', baseWeight: 7 },
];

export const NON_CLASSIC_SHAPE_IDS = new Set<string>(
  ZEN_PENTOMINO_SHAPES.map((s) => s.id)
);

export const POLYOMINO_CATALOG: PolyominoShape[] = [
  ...CLASSIC_POLYOMINO_CATALOG,
  ...ZEN_PENTOMINO_SHAPES,
];

export function normalizeCells(cells: CellCoord[]): CellCoord[] {
  if (cells.length === 0) return [];
  let minR = Infinity;
  let minC = Infinity;
  for (const cell of cells) {
    if (cell.r < minR) minR = cell.r;
    if (cell.c < minC) minC = cell.c;
  }
  const normalized = cells.map((cell) => ({
    r: cell.r - minR,
    c: cell.c - minC,
  }));
  normalized.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));
  return normalized;
}

export function rotateCellsCW(cells: CellCoord[]): CellCoord[] {
  if (cells.length === 0) return [];
  let maxR = 0;
  for (const cell of cells) {
    if (cell.r > maxR) maxR = cell.r;
  }
  const rotated = cells.map((cell) => ({
    r: cell.c,
    c: maxR - cell.r,
  }));
  return normalizeCells(rotated);
}

export function rotatePieceCW(piece: PieceInstance, steps = 1): PieceInstance {
  const count = ((steps % 4) + 4) % 4;
  if (count === 0) return piece;

  // Preserve specialCellIndex and acornCellIndices mapping across rotation!
  let tagged = piece.cells.map((cell, idx) => ({
    r: cell.r,
    c: cell.c,
    isSpecial: idx === piece.specialCellIndex,
    isAcorn: Boolean(piece.acornCellIndices?.includes(idx)),
  }));

  for (let i = 0; i < count; i++) {
    let maxR = 0;
    for (const item of tagged) {
      if (item.r > maxR) maxR = item.r;
    }
    tagged = tagged.map((item) => ({
      ...item,
      r: item.c,
      c: maxR - item.r,
    }));
    let minR = Infinity;
    let minC = Infinity;
    for (const item of tagged) {
      if (item.r < minR) minR = item.r;
      if (item.c < minC) minC = item.c;
    }
    tagged = tagged.map((item) => ({
      ...item,
      r: item.r - minR,
      c: item.c - minC,
    }));
    tagged.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));
  }

  let nextSpecialIdx: number | undefined = undefined;
  const nextAcornIndices: number[] = [];
  const nextCells: CellCoord[] = tagged.map((item, idx) => {
    if (item.isSpecial) nextSpecialIdx = idx;
    if (item.isAcorn) nextAcornIndices.push(idx);
    return { r: item.r, c: item.c };
  });

  return {
    ...piece,
    cells: nextCells,
    rotations: (piece.rotations + count) % 4,
    specialCellIndex: nextSpecialIdx,
    acornCellIndices: nextAcornIndices.length > 0 ? nextAcornIndices : undefined,
  };
}

export function getShapeDimensions(cells: CellCoord[]): { rows: number; cols: number } {
  let maxR = 0;
  let maxC = 0;
  for (const cell of cells) {
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

export function getCellsSignature(cells: CellCoord[]): string {
  return cells.map((cell) => `${cell.r},${cell.c}`).join(';');
}

export function getUniqueOrientations(cells: CellCoord[]): { cells: CellCoord[]; steps: number }[] {
  const seen = new Set<string>();
  const results: { cells: CellCoord[]; steps: number }[] = [];
  let current = normalizeCells(cells);
  for (let steps = 0; steps < 4; steps++) {
    const sig = getCellsSignature(current);
    if (!seen.has(sig)) {
      seen.add(sig);
      results.push({ cells: current, steps });
    }
    current = rotateCellsCW(current);
  }
  return results;
}

export interface SeededRng {
  next: () => number;
  getState: () => number;
}

export function normalizeSeedCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 18) || 'HAVEN-84';
}

export function hashSeedCode(seedCode: string): number {
  let h = 2166136261 >>> 0;
  const clean = normalizeSeedCode(seedCode);
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1337;
}

/**
 * Deterministic Mulberry32 PRNG used across Story & Same-Seed Friend Duel modes.
 */
export function mulberry32(initialState: number): SeededRng {
  let state = initialState >>> 0 || 1;
  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState: () => state >>> 0,
  };
}

export const createSeededRng = mulberry32;

export function generateSeedCode(): string {
  const prefixes = ['HAVEN', 'BLOOM', 'CEDAR', 'AMBER', 'MOSSY', 'PORCH'];
  const word = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}-${num}`;
}

let pieceUidCounter = 1;

export interface PieceExtras {
  specialCellIndex?: number;
  specialType?: SpecialBlockType;
  acornCellIndices?: number[];
}

export function createPieceInstance(
  shape: PolyominoShape,
  material: MaterialType,
  uidOverride?: string,
  extras?: PieceExtras
): PieceInstance {
  const uid = uidOverride ?? `pc_${Date.now().toString(36)}_${pieceUidCounter++}`;
  return {
    uid,
    shapeId: shape.id,
    name: shape.name,
    cells: shape.cells.map((cell) => ({ ...cell })),
    material,
    rotations: 0,
    specialCellIndex: extras?.specialCellIndex,
    specialType: extras?.specialType,
    acornCellIndices: extras?.acornCellIndices,
  };
}
