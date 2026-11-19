export const GRID_SIZE = 8;

export type MaterialType =
  | 'honey_oak'
  | 'glazed_ceramic'
  | 'sea_glass'
  | 'woven_rattan';

export type SpecialBlockType =
  | 'amber_honey'
  | 'bloom_seed'
  | 'lantern_glow';

export type CellKind = 'tile' | 'blocked' | 'moss' | 'flower';

export type BoardShapeId =
  | 'courtyard'
  | 'bay_window'
  | 'fountain_atrium'
  | 'twin_garden';

export type GameMode = 'story' | 'duel' | 'zen';

export type LevelGoalType = 'score' | 'acorn_gems' | 'clear_moss';

export type DifficultyTier = 'standard' | 'master_trial' | 'bonus_bloom';

export interface LevelGoal {
  type: LevelGoalType;
  target: number;
  label: string;
}

export interface LevelDefinition {
  levelNumber: number;
  title: string;
  subtitle: string;
  boardShape: BoardShapeId;
  difficultyTier?: DifficultyTier;
  starMultiplier?: number;
  goal: LevelGoal;
  allowedSpecials: SpecialBlockType[];
  initialMossCoords: CellCoord[];
  initialAcornCoords: CellCoord[];
  starThresholds: [number, number, number];
}

export interface CellCoord {
  r: number;
  c: number;
}

export interface PolyominoShape {
  id: string;
  name: string;
  cells: CellCoord[];
  tier: 'tiny' | 'small' | 'medium' | 'large';
  baseWeight: number;
}

export interface PieceInstance {
  uid: string;
  shapeId: string;
  name: string;
  cells: CellCoord[];
  material: MaterialType;
  rotations: number; // 0, 1, 2, 3 (90deg CW steps)
  specialCellIndex?: number;
  specialType?: SpecialBlockType;
  acornCellIndices?: number[];
}

export interface BoardCell {
  kind: CellKind;
  material: MaterialType;
  uid: string;
  special?: SpecialBlockType;
  hasAcornGem?: boolean;
  justPlaced?: boolean;
  justSprouted?: boolean;
}

export type Grid8x8 = (BoardCell | null)[][];

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type PieceSource =
  | { kind: 'tray'; index: number }
  | { kind: 'pocket' };

export interface PlacementPreview {
  valid: boolean;
  anchorRow: number;
  anchorCol: number;
  targetCells: CellCoord[];
  clearedRows: number[];
  clearedCols: number[];
  totalClearedLines: number;
}

export interface PlacementOutcome {
  nextGrid: Grid8x8;
  clearedRows: number[];
  clearedCols: number[];
  splashedCells: CellCoord[];
  sproutedCells: CellCoord[];
  allClearedKeys: string[];
  totalClearedLines: number;
  cascadeCount: number;
  cascadeLinesCleared: number;
  cascadeBonusScore: number;
  placeScore: number;
  clearScore: number;
  lanternDoubled: boolean;
  totalScoreGained: number;
  nextCombo: number;
  earnedRotateCharges: number;
  nextRotateGaugePct: number;
  mossCleared: number;
  acornGemsCollected: number;
  bonusFlowerStars: number;
}

export interface UndoSnapshot {
  grid: Grid8x8;
  tray: (PieceInstance | null)[];
  pocket: PieceInstance | null;
  score: number;
  combo: number;
  linesCleared: number;
  movesPlaced: number;
  mossCleared: number;
  acornGemsCollected: number;
  bonusStarsEarned: number;
  rotateCharges: number;
  rotateGaugePct: number;
  selectedSource: PieceSource | null;
}

export interface RunStats {
  mode: GameMode;
  levelNumber: number;
  levelTitle: string;
  boardShape: BoardShapeId;
  difficultyTier: DifficultyTier;
  starMultiplier: number;
  score: number;
  bestScore: number;
  linesCleared: number;
  movesPlaced: number;
  bestCombo: number;
  mossCleared: number;
  acornGemsCollected: number;
  bonusStarsEarned: number;
  starsAwarded: number;
  gemsAwarded?: number;
  seedCode: string;
  goal: LevelGoal | null;
}

export type HavenChapterId =
  | 'cottage_living'
  | 'zen_garden'
  | 'rainy_conservatory';

export type JournalTabId = 'calendar' | 'milestones' | 'memories';

export interface PetBondState {
  level: number;
  xp: number;
  lastTreatDate: string | null;
}

export interface LifetimeStats {
  totalLinesCleared: number;
  highestComboEver: number;
  totalBlocksPlaced: number;
  totalAcornGems: number;
  totalStoryWins: number;
}

export type FurnitureSlotId =
  | 'sofa'
  | 'bookshelf'
  | 'hearth'
  | 'rug'
  | 'window'
  | 'plants'
  | 'lamp'
  | 'table';

export type FurnitureStyleId =
  | 'cottage_oak'
  | 'minimalist_zen'
  | 'starlight_velvet';

export type PetKind = 'ginger_cat' | 'shiba_pup' | 'lop_bunny';

export type ShopTabId = 'bundles' | 'gems' | 'shop';

export type TileSkinId = 'classic' | 'golden_lantern';

export type WindowThemeId = 'classic' | 'rainy_conservatory';

export type StoreProductId =
  | 'bundle_cozy_starter_v1'
  | 'bundle_master_artisan_v1'
  | 'gems_pouch_80'
  | 'gems_basket_450'
  | 'gems_chest_1000'
  | 'gems_vault_2400';

export type GemShopItemId =
  | 'pet_lop_bunny'
  | 'theme_rainy_window'
  | 'skin_golden_lantern'
  | 'refill_undo_3'
  | 'refill_rotate_3'
  | 'mystery_seed_pouch';

export type PetAccessoryId =
  | 'bell_collar'
  | 'bow_tie'
  | 'scarf'
  | 'glasses'
  | 'flower_crown'
  | 'wizard_hat';

export type HerbariumCategory = 'botanicals' | 'teacups' | 'pet_moments';

export type HerbariumRarity = 'common' | 'rare' | 'heirloom';

export interface HerbariumCardDef {
  id: string;
  number: number; // 1..24
  category: HerbariumCategory;
  rarity: HerbariumRarity;
  title: string;
  latinOrNote: string;
  bgHex: string;
  accentHex: string;
  trimHex: string;
}

export interface HerbariumProgress {
  unlockedCardIds: string[];
  cardCounts: Record<string, number>;
  seedPacks: number;
  goldenLeaves: number;
  unlockedAccessories: PetAccessoryId[];
  equippedAccessory: PetAccessoryId | null;
  storyWinsCount: number;
}

export type AppView = 'puzzle' | 'haven';

export type HavenFurnitureMap = Partial<Record<FurnitureSlotId, FurnitureStyleId>>;

export interface HavenProgress {
  activeChapter: HavenChapterId;
  activePet: PetKind;
  rooms: Record<HavenChapterId, HavenFurnitureMap>;
}

export type AdRewardType =
  | 'UNDO'
  | 'ROTATE'
  | 'REVIVE_CLEAR_3X3'
  | 'DOUBLE_STARS'
  | 'FREE_GEMS';

export type AdConsentStatus = 'unknown' | 'obtained';

export interface PlayerSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  screenShakeEnabled: boolean;
  ambientSoundEnabled?: boolean;
  colorblindMode?: boolean;
}

export interface MonetizationState {
  noAdsBundlePurchased: boolean;
  starterOfferShown: boolean;
  ratingPromptShown: boolean;
  adConsentStatus: AdConsentStatus;
  streakCount: number; // 0..7
  lastClaimDate: string | null; // YYYY-MM-DD
  totalDaysClaimed: number;
}

export interface ClearedParticleBurst {
  id: string;
  r: number;
  c: number;
  colorHex: string;
  accentHex: string;
}

export type JitTipId = 'rotate' | 'pocket' | 'undo';

export interface PersistedState {
  version: 2;
  bestScore: number;
  duelBestScore: number;
  cozyStars: number;
  cozyGems: number;
  unlockedPremiumItems: string[];
  activeTileSkin: TileSkinId;
  activeWindowTheme: WindowThemeId;
  unlockedLevel: number;
  currentLevel: number;
  fireflyStreak: number; // 0..5
  levelStars: Record<number, number>;
  levelLosses: Record<number, number>;
  nightCandleMode: boolean;
  muted: boolean;
  settings: PlayerSettings;
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  monetization: MonetizationState;
  dismissedTips?: JitTipId[];
  firstSofaPromptDone?: boolean;
  completedDailyDates?: string[];
  dailyBestScore?: number;
  petBond?: PetBondState;
  lifetimeStats?: LifetimeStats;
  claimedMilestones?: string[];
  rewardedCompletedChapters?: HavenChapterId[];
  activeRun: {
    mode: GameMode;
    levelNumber: number;
    grid: Grid8x8;
    tray: (PieceInstance | null)[];
    pocket: PieceInstance | null;
    score: number;
    combo: number;
    bestCombo: number;
    linesCleared: number;
    movesPlaced: number;
    mossCleared: number;
    acornGemsCollected: number;
    bonusStarsEarned: number;
    rotateCharges: number;
    rotateGaugePct: number;
    undoCharges: number;
    undoStack: UndoSnapshot[];
    seedCode: string;
    rngState: number;
  } | null;
}
