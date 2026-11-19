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

// ---------- Cozy Milestones / Achievements ----------

export interface MilestoneProgressContext {
  lifetimeStats: LifetimeStats;
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  completedDailyDates: string[];
  petBond: PetBondState;
}

export interface CozyMilestoneDef {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardGems: number;
  rewardSeedPacks: number;
  getCurrent: (ctx: MilestoneProgressContext) => number;
}

export const COZY_MILESTONES: CozyMilestoneDef[] = [
  {
    id: 'ms_first_furniture',
    title: 'First Cozy Touch',
    description: 'Restore your very first piece of furniture in My Haven',
    target: 1,
    rewardGems: 10,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => countUnlockedFurniture(ctx.haven),
  },
  {
    id: 'ms_combo_artisan',
    title: 'Combo Artisan',
    description: 'Reach a 3× combo chain in any puzzle mode',
    target: 3,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.highestComboEver,
  },
  {
    id: 'ms_lines_25',
    title: 'Warm Hearth Weaver',
    description: 'Clear 25 total lines across Story, Daily, or Zen runs',
    target: 25,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.lifetimeStats.totalLinesCleared,
  },
  {
    id: 'ms_lines_100',
    title: 'Master Timber Crafter',
    description: 'Clear 100 total lines across all puzzle sessions',
    target: 100,
    rewardGems: 25,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.lifetimeStats.totalLinesCleared,
  },
  {
    id: 'ms_daily_1',
    title: 'Morning Ritual',
    description: 'Complete your first Daily Haven Puzzle',
    target: 1,
    rewardGems: 10,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.completedDailyDates.length,
  },
  {
    id: 'ms_daily_5',
    title: 'Calendar Keeper',
    description: 'Complete 5 Daily Haven Puzzles (at your own pace)',
    target: 5,
    rewardGems: 25,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.completedDailyDates.length,
  },
  {
    id: 'ms_room_restored_1',
    title: 'Home Sweet Haven',
    description: 'Fully restore all 8 furniture pieces in any Cozy Room',
    target: 1,
    rewardGems: 30,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => countCompletedChapters(ctx.haven),
  },
  {
    id: 'ms_furniture_12',
    title: 'Interior Curator',
    description: 'Restore 12 total furniture pieces across your chapters',
    target: 12,
    rewardGems: 25,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => countUnlockedFurniture(ctx.haven),
  },
  {
    id: 'ms_herbarium_12',
    title: 'Botanical Archivist',
    description: 'Collect 12 unique cards in the Herbarium Scrapbook',
    target: 12,
    rewardGems: 20,
    rewardSeedPacks: 1,
    getCurrent: (ctx) => ctx.herbarium.unlockedCardIds.length,
  },
  {
    id: 'ms_pet_bond_2',
    title: 'Kindred Spirits',
    description: 'Reach Bond Level 2 with your Haven companion pet',
    target: 2,
    rewardGems: 15,
    rewardSeedPacks: 0,
    getCurrent: (ctx) => ctx.petBond.level,
  },
];

export interface EvaluatedMilestone {
  def: CozyMilestoneDef;
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
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
    return {
      def,
      current,
      target: def.target,
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  });
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
