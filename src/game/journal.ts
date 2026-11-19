import {
  countCompletedChapters,
  countUnlockedFurniture,
  FURNITURE_SLOTS,
  getSlotLabelForChapter,
  HAVEN_CHAPTER_META,
} from './haven';
import { getTodayDateKey } from './monetization';
import type {
  FurnitureSlotId,
  HavenChapterId,
  HavenProgress,
  HerbariumProgress,
  LifetimeStats,
  PetBondState,
} from './types';

export const PET_TREAT_DAILY_GEMS = 5;
export const PET_BOND_XP_PER_LEVEL = 3;

export function createDefaultPetBondState(): PetBondState {
  return {
    level: 1,
    xp: 0,
    lastTreatDate: null,
  };
}

export function createDefaultLifetimeStats(): LifetimeStats {
  return {
    totalLinesCleared: 0,
    highestComboEver: 0,
    totalBlocksPlaced: 0,
    totalAcornGems: 0,
    totalStoryWins: 0,
    bestFireflyStreak: 0,
  };
}

export function canGiveDailyPetTreat(
  bond: PetBondState,
  todayKey = getTodayDateKey()
): boolean {
  return bond.lastTreatDate !== todayKey;
}

/**
 * Gives the active pet a cozy daily treat (non-punitive — missing days never lowers bond).
 * Grants +5 Cozy Gems daily, plus +1 Rotate Charge whenever the pet levels up!
 */
export function giveDailyPetTreat(
  bond: PetBondState,
  todayKey = getTodayDateKey()
): {
  given: boolean;
  leveledUp: boolean;
  gemsEarned: number;
  bonusRotateCharges: number;
  nextBond: PetBondState;
} {
  if (!canGiveDailyPetTreat(bond, todayKey)) {
    return {
      given: false,
      leveledUp: false,
      gemsEarned: 0,
      bonusRotateCharges: 0,
      nextBond: bond,
    };
  }

  const nextXpRaw = bond.xp + 1;
  const leveledUp = nextXpRaw >= PET_BOND_XP_PER_LEVEL;
  const nextLevel = leveledUp ? bond.level + 1 : bond.level;
  const nextXp = leveledUp ? 0 : nextXpRaw;

  return {
    given: true,
    leveledUp,
    gemsEarned: PET_TREAT_DAILY_GEMS,
    bonusRotateCharges: leveledUp ? 1 : 0,
    nextBond: {
      level: nextLevel,
      xp: nextXp,
      lastTreatDate: todayKey,
    },
  };
}

// ---------- Monthly Daily Calendar & Trophies ----------

export type MonthlyTrophyTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface CalendarDayCell {
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthlyCalendarSummary {
  year: number;
  monthIndex: number; // 0..11
  monthLabel: string;
  leadingEmptyCells: number; // 0..6 (Sun=0)
  days: CalendarDayCell[];
  completedCountThisMonth: number;
  trophyTier: MonthlyTrophyTier;
  nextTrophyTarget: number | null;
  nextTrophyLabel: string | null;
}

export const MONTHLY_TROPHY_THRESHOLDS = {
  bronze: 5,
  silver: 12,
  gold: 20,
} as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function computeMonthlyTrophyTier(completedDays: number): MonthlyTrophyTier {
  if (completedDays >= MONTHLY_TROPHY_THRESHOLDS.gold) return 'gold';
  if (completedDays >= MONTHLY_TROPHY_THRESHOLDS.silver) return 'silver';
  if (completedDays >= MONTHLY_TROPHY_THRESHOLDS.bronze) return 'bronze';
  return 'none';
}

export function buildDailyCalendarMonth(
  year: number,
  monthIndex: number,
  completedDailyDates: string[],
  todayKey = getTodayDateKey()
): MonthlyCalendarSummary {
  const completedSet = new Set(completedDailyDates);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const leadingEmptyCells = firstOfMonth.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthStr = String(monthIndex + 1).padStart(2, '0');

  const days: CalendarDayCell[] = [];
  let completedCountThisMonth = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;
    const completed = completedSet.has(dateKey);
    if (completed) completedCountThisMonth += 1;
    days.push({
      dateKey,
      dayNumber: d,
      completed,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    });
  }

  const trophyTier = computeMonthlyTrophyTier(completedCountThisMonth);
  let nextTrophyTarget: number | null = null;
  let nextTrophyLabel: string | null = null;

  if (trophyTier === 'none') {
    nextTrophyTarget = MONTHLY_TROPHY_THRESHOLDS.bronze;
    nextTrophyLabel = 'Bronze Leaf Trophy';
  } else if (trophyTier === 'bronze') {
    nextTrophyTarget = MONTHLY_TROPHY_THRESHOLDS.silver;
    nextTrophyLabel = 'Silver Lantern Trophy';
  } else if (trophyTier === 'silver') {
    nextTrophyTarget = MONTHLY_TROPHY_THRESHOLDS.gold;
    nextTrophyLabel = 'Gold Conservatory Crown';
  }

  return {
    year,
    monthIndex,
    monthLabel: `${MONTH_NAMES[monthIndex] ?? 'Month'} ${year}`,
    leadingEmptyCells,
    days,
    completedCountThisMonth,
    trophyTier,
    nextTrophyTarget,
    nextTrophyLabel,
  };
}

// ---------- Haven Milestones / Collectible Achievement Badges ----------

export type MilestoneCategory = 'gameplay' | 'haven' | 'collection';

export type MilestoneBadgeTier = 'bronze' | 'silver' | 'gold' | 'heirloom';

export type MilestoneBadgeIcon =
  | 'sofa'
  | 'flame'
  | 'layers'
  | 'timber'
  | 'firefly_crown'
  | 'compass'
  | 'acorn'
  | 'sun'
  | 'calendar'
  | 'home'
  | 'palette'
  | 'leaf'
  | 'heart';

export interface MilestoneProgressContext {
  lifetimeStats: LifetimeStats;
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  completedDailyDates: string[];
  petBond: PetBondState;
  fireflyStreak?: number;
}

export interface CozyMilestoneDef {
  id: string;
  title: string;
  featLabel: string;
  badgeLabel: string;
  description: string;
  category: MilestoneCategory;
  badgeTier: MilestoneBadgeTier;
  badgeIcon: MilestoneBadgeIcon;
  target: number;
  rewardGems: number;
  rewardSeedPacks: number;
  getCurrent: (ctx: MilestoneProgressContext) => number;
}

export function getBestFireflyStreak(ctx: MilestoneProgressContext): number {
  return Math.max(
    ctx.lifetimeStats.bestFireflyStreak ?? 0,
    ctx.fireflyStreak ?? 0
  );
}

export const COZY_MILESTONES: CozyMilestoneDef[] = [
  {
    id: 'ms_lines_100',
    title: '100 Lines Cleared',
    featLabel: 'Master Timber Crafter',
    badgeLabel: '100 Lines',
    description: 'Clear 100 total lines across Story, Daily, or Endless Zen runs',
    category: 'gameplay',
    badgeTier: 'gold',
    badgeIcon: 'timber',
    target: 100,
    rewardGems: 25,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.lifetimeStats.totalLinesCleared,
  },
  {
    id: 'ms_perfect_5_streak',
    title: 'Perfect 5-Streak',
    featLabel: 'Firefly Lantern Sovereign',
    badgeLabel: '5-Streak',
    description: 'Light all 5 Firefly Lanterns with 5 consecutive Story Mode victories',
    category: 'gameplay',
    badgeTier: 'heirloom',
    badgeIcon: 'firefly_crown',
    target: 5,
    rewardGems: 30,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => getBestFireflyStreak(ctx),
  },
  {
    id: 'ms_combo_artisan',
    title: '3× Combo Chain',
    featLabel: 'Combo Artisan',
    badgeLabel: '3× Combo',
    description: 'Reach a 3× combo chain in any puzzle mode',
    category: 'gameplay',
    badgeTier: 'silver',
    badgeIcon: 'flame',
    target: 3,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.highestComboEver,
  },
  {
    id: 'ms_lines_25',
    title: '25 Lines Cleared',
    featLabel: 'Warm Hearth Weaver',
    badgeLabel: '25 Lines',
    description: 'Clear 25 total lines across Story, Daily, or Zen runs',
    category: 'gameplay',
    badgeTier: 'bronze',
    badgeIcon: 'layers',
    target: 25,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.totalLinesCleared,
  },
  {
    id: 'ms_story_5',
    title: '5 Story Victories',
    featLabel: 'Cottage Pathfinder',
    badgeLabel: '5 Wins',
    description: 'Complete 5 Story Mode puzzle chapters',
    category: 'gameplay',
    badgeTier: 'silver',
    badgeIcon: 'compass',
    target: 5,
    rewardGems: 20,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.totalStoryWins,
  },
  {
    id: 'ms_acorn_20',
    title: '20 Acorn Gems',
    featLabel: 'Acorn Gatherer',
    badgeLabel: '20 Acorns',
    description: 'Harvest 20 golden Acorn Gems from cleared puzzle lines',
    category: 'gameplay',
    badgeTier: 'silver',
    badgeIcon: 'acorn',
    target: 20,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.totalAcornGems,
  },
  {
    id: 'ms_first_furniture',
    title: 'First Cozy Touch',
    featLabel: 'Room Decorator',
    badgeLabel: '1st Piece',
    description: 'Restore your very first piece of furniture in My Haven',
    category: 'haven',
    badgeTier: 'bronze',
    badgeIcon: 'sofa',
    target: 1,
    rewardGems: 10,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => countUnlockedFurniture(ctx.haven),
  },
  {
    id: 'ms_room_restored_1',
    title: 'Home Sweet Haven',
    featLabel: 'Chapter Architect',
    badgeLabel: 'Full Room',
    description: 'Fully restore all 8 furniture pieces in any Cozy Room',
    category: 'haven',
    badgeTier: 'gold',
    badgeIcon: 'home',
    target: 1,
    rewardGems: 30,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => countCompletedChapters(ctx.haven),
  },
  {
    id: 'ms_furniture_12',
    title: 'Interior Curator',
    featLabel: '12 Restorations',
    badgeLabel: '12 Pieces',
    description: 'Restore 12 total furniture pieces across your chapters',
    category: 'haven',
    badgeTier: 'gold',
    badgeIcon: 'palette',
    target: 12,
    rewardGems: 25,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => countUnlockedFurniture(ctx.haven),
  },
  {
    id: 'ms_pet_bond_2',
    title: 'Kindred Spirits',
    featLabel: 'Pet Bond Lv 2',
    badgeLabel: 'Bond Lv 2',
    description: 'Reach Bond Level 2 with your Haven companion pet',
    category: 'haven',
    badgeTier: 'silver',
    badgeIcon: 'heart',
    target: 2,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.petBond.level,
  },
  {
    id: 'ms_daily_1',
    title: 'Morning Ritual',
    featLabel: 'First Daily Board',
    badgeLabel: '1st Daily',
    description: 'Complete your first Daily Haven Puzzle',
    category: 'collection',
    badgeTier: 'bronze',
    badgeIcon: 'sun',
    target: 1,
    rewardGems: 10,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.completedDailyDates.length,
  },
  {
    id: 'ms_daily_5',
    title: 'Calendar Keeper',
    featLabel: '5 Daily Boards',
    badgeLabel: '5 Dailies',
    description: 'Complete 5 Daily Haven Puzzles (at your own pace)',
    category: 'collection',
    badgeTier: 'silver',
    badgeIcon: 'calendar',
    target: 5,
    rewardGems: 25,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.completedDailyDates.length,
  },
  {
    id: 'ms_herbarium_12',
    title: 'Botanical Archivist',
    featLabel: '12 Herbarium Cards',
    badgeLabel: '12 Cards',
    description: 'Collect 12 unique cards in the Herbarium Scrapbook',
    category: 'collection',
    badgeTier: 'gold',
    badgeIcon: 'leaf',
    target: 12,
    rewardGems: 20,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.herbarium.unlockedCardIds.length,
  },
];

export interface EvaluatedMilestone {
  def: CozyMilestoneDef;
  current: number;
  target: number;
  progressPct: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface MilestoneBadgeSummary {
  total: number;
  unlocked: number;
  claimed: number;
  claimable: number;
  completionPct: number;
}

export function evaluateMilestones(
  ctx: MilestoneProgressContext,
  claimedMilestones: string[]
): EvaluatedMilestone[] {
  const claimedSet = new Set(claimedMilestones);
  return COZY_MILESTONES.map((def) => {
    const current = Math.max(0, Math.floor(def.getCurrent(ctx)));
    const completed = current >= def.target;
    const claimed = claimedSet.has(def.id);
    const progressPct =
      def.target > 0 ? Math.min(100, Math.round((current / def.target) * 100)) : 100;
    return {
      def,
      current,
      target: def.target,
      progressPct,
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  });
}

export function summarizeMilestoneBadges(
  evaluated: EvaluatedMilestone[]
): MilestoneBadgeSummary {
  const total = evaluated.length;
  const unlocked = evaluated.filter((m) => m.completed).length;
  const claimed = evaluated.filter((m) => m.claimed).length;
  const claimable = evaluated.filter((m) => m.claimable).length;
  const completionPct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  return { total, unlocked, claimed, claimable, completionPct };
}

export function filterMilestonesByCategory(
  evaluated: EvaluatedMilestone[],
  category: 'all' | MilestoneCategory
): EvaluatedMilestone[] {
  if (category === 'all') return evaluated;
  return evaluated.filter((m) => m.def.category === category);
}

export function countClaimableMilestones(
  ctx: MilestoneProgressContext,
  claimedMilestones: string[]
): number {
  return evaluateMilestones(ctx, claimedMilestones).filter((m) => m.claimable).length;
}

export function claimMilestoneReward(
  milestoneId: string,
  ctx: MilestoneProgressContext,
  claimedMilestones: string[]
): {
  claimed: boolean;
  gemsEarned: number;
  seedPacksEarned: number;
  nextClaimedMilestones: string[];
  title: string;
} {
  const evaluated = evaluateMilestones(ctx, claimedMilestones).find(
    (m) => m.def.id === milestoneId
  );
  if (!evaluated || !evaluated.claimable) {
    return {
      claimed: false,
      gemsEarned: 0,
      seedPacksEarned: 0,
      nextClaimedMilestones: claimedMilestones,
      title: evaluated?.def.title ?? '',
    };
  }

  return {
    claimed: true,
    gemsEarned: evaluated.def.rewardGems,
    seedPacksEarned: evaluated.def.rewardSeedPacks,
    nextClaimedMilestones: [...claimedMilestones, milestoneId],
    title: evaluated.def.title,
  };
}

// ---------- Environmental Storytelling: Haven Journal Memories ----------

const FURNITURE_MEMORIES: Record<HavenChapterId, Record<FurnitureSlotId, string>> = {
  cottage_living: {
    window: 'Morning sunlight pours across the oak sill, warming the painted flower box.',
    plants: 'Trailing ivy sways softly above the window whenever a garden breeze slips in.',
    bookshelf: 'Hand-bound botanical atlases and a glazed teacup now line the cedar shelves.',
    hearth: 'Crackling cedar logs cast amber light across every corner of the cottage.',
    lamp: 'A soft amber linen shade turns late evenings into quiet reading hours.',
    sofa: 'Your companion curled up in the sunlit cushion corner within ten seconds.',
    rug: 'Woven wool softens every footstep and ties the warm timber planks together.',
    table: 'Fresh chamomile tea steams gently beside two mismatched heirloom cups.',
  },
  zen_garden: {
    window: 'Translucent shoji panels filter the dawn mist into calm golden squares.',
    plants: 'Tall green bamboo whispers quietly along the cedar veranda edge.',
    bookshelf: 'A sculpted miniature pine anchors the alcove with patient, quiet balance.',
    hearth: 'Water taps steadily from the bamboo spout into a glassy stone basin.',
    lamp: 'The carved granite lantern glows like a warm moonbeam over raked gravel.',
    sofa: 'Smooth cedar slats invite slow afternoons watching koi circle the pond.',
    rug: 'Moss-rimmed stepping stones trace an unhurried path across the courtyard.',
    table: 'Whisked matcha rests on a lacquered tray while fireflies drift past.',
  },
  rainy_conservatory: {
    window: 'Soft rain taps a steady lullaby across the arched glass attic skylight.',
    plants: 'Feathery Boston ferns drink in the humid conservatory mist from above.',
    bookshelf: 'Pressed petals, field notes, and rain-splattered seed jars fill the shelves.',
    hearth: 'The little cast-iron stove radiates dry, steady warmth against the cool rain.',
    lamp: 'Warm brass pendants mirror themselves as golden droplets on the glass roof.',
    sofa: 'A plush reading daybed tucked right beneath the rain-streaked glass dome.',
    rug: 'An heirloom botanical tapestry warms the wide timber attic floorboards.',
    table: 'Terracotta pots, twine, and a steaming kettle share the potting bench.',
  },
};

export interface HavenMemoryEntry {
  key: string;
  chapter: HavenChapterId;
  chapterTitle: string;
  slotId: FurnitureSlotId;
  slotLabel: string;
  note: string;
}

export function getFurnitureMemoryNote(
  chapter: HavenChapterId,
  slotId: FurnitureSlotId
): string {
  return FURNITURE_MEMORIES[chapter]?.[slotId] ?? 'A cozy corner gently restored.';
}

export function getUnlockedHavenMemories(haven: HavenProgress): HavenMemoryEntry[] {
  const chapters: HavenChapterId[] = [
    'cottage_living',
    'zen_garden',
    'rainy_conservatory',
  ];
  const entries: HavenMemoryEntry[] = [];

  for (const chapter of chapters) {
    const roomMap = haven.rooms[chapter] ?? {};
    for (const slot of FURNITURE_SLOTS) {
      if (roomMap[slot.id]) {
        entries.push({
          key: `${chapter}:${slot.id}`,
          chapter,
          chapterTitle: HAVEN_CHAPTER_META[chapter].title,
          slotId: slot.id,
          slotLabel: getSlotLabelForChapter(slot, chapter),
          note: getFurnitureMemoryNote(chapter, slot.id),
        });
      }
    }
  }
  return entries;
}
