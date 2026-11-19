import type {
  FurnitureSlotId,
  FurnitureStyleId,
  HavenChapterId,
  HavenProgress,
  PetKind,
} from './types';

export interface FurnitureSlotDefinition {
  id: FurnitureSlotId;
  cost: number;
  cottageLabel: string;
  zenLabel: string;
  conservatoryLabel: string;
  // Approximate hotspot anchor % in the 800x500 SVG room canvas
  hotspotX: number;
  hotspotY: number;
}

export const ROOM_COMPLETION_BONUS_GEMS = 25;

export const FURNITURE_SLOTS: FurnitureSlotDefinition[] = [
  {
    id: 'window',
    cost: 2,
    cottageLabel: 'Bay Window',
    zenLabel: 'Shoji Pavilion',
    conservatoryLabel: 'Arched Glass Skylight',
    hotspotX: 50,
    hotspotY: 22,
  },
  {
    id: 'plants',
    cost: 1,
    cottageLabel: 'Hanging Plants',
    zenLabel: 'Bamboo & Vines',
    conservatoryLabel: 'Hanging Boston Ferns',
    hotspotX: 25,
    hotspotY: 16,
  },
  {
    id: 'bookshelf',
    cost: 1,
    cottageLabel: 'Bookshelf',
    zenLabel: 'Bonsai Alcove',
    conservatoryLabel: 'Botanical Library',
    hotspotX: 16,
    hotspotY: 42,
  },
  {
    id: 'hearth',
    cost: 2,
    cottageLabel: 'Fireplace',
    zenLabel: 'Stone Fountain',
    conservatoryLabel: 'Cast-Iron Hearth Stove',
    hotspotX: 82,
    hotspotY: 44,
  },
  {
    id: 'lamp',
    cost: 1,
    cottageLabel: 'Floor Lamp',
    zenLabel: 'Garden Lantern',
    conservatoryLabel: 'Brass Greenhouse Lamp',
    hotspotX: 70,
    hotspotY: 36,
  },
  {
    id: 'sofa',
    cost: 1,
    cottageLabel: 'Cozy Sofa',
    zenLabel: 'Timber Bench',
    conservatoryLabel: 'Velvet Reading Daybed',
    hotspotX: 35,
    hotspotY: 54,
  },
  {
    id: 'rug',
    cost: 1,
    cottageLabel: 'Woven Rug',
    zenLabel: 'Stepping Stones',
    conservatoryLabel: 'Botanical Tapestry Rug',
    hotspotX: 45,
    hotspotY: 81,
  },
  {
    id: 'table',
    cost: 2,
    cottageLabel: 'Tea Table',
    zenLabel: 'Matcha Tea Set',
    conservatoryLabel: 'Potting & Tea Bench',
    hotspotX: 57,
    hotspotY: 66,
  },
];

export function getSlotLabelForChapter(
  slot: FurnitureSlotDefinition,
  chapter: HavenChapterId
): string {
  if (chapter === 'cottage_living') return slot.cottageLabel;
  if (chapter === 'zen_garden') return slot.zenLabel;
  return slot.conservatoryLabel;
}

export const FURNITURE_STYLES: {
  id: FurnitureStyleId;
  name: string;
  accentHex: string;
  secondaryHex: string;
  trimHex: string;
}[] = [
  {
    id: 'cottage_oak',
    name: 'Cottagecore Oak',
    accentHex: '#C47D2C',
    secondaryHex: '#E8D5B7',
    trimHex: '#3F6B4E',
  },
  {
    id: 'minimalist_zen',
    name: 'Minimalist Zen',
    accentHex: '#7A9A86',
    secondaryHex: '#EDEBE4',
    trimHex: '#4E5D52',
  },
  {
    id: 'starlight_velvet',
    name: 'Starlight Velvet',
    accentHex: '#3B4270',
    secondaryHex: '#D9A441',
    trimHex: '#1F2442',
  },
];

export const HAVEN_CHAPTER_META: Record<
  HavenChapterId,
  { title: string; subtitle: string; shortLabel: string }
> = {
  cottage_living: {
    title: 'Sunlit Cottage Living Room',
    subtitle: 'Chapter 1 · Warm hearth, bay window & reading nook',
    shortLabel: 'Ch. 1 Cottage',
  },
  zen_garden: {
    title: 'Zen Tea Garden',
    subtitle: 'Chapter 2 · Koi fountain, bamboo & moonlit matcha terrace',
    shortLabel: 'Ch. 2 Zen',
  },
  rainy_conservatory: {
    title: 'Rainy Attic Conservatory',
    subtitle: 'Chapter 3 · Glass skylight, soft rain, ferns & cast-iron warmth',
    shortLabel: 'Ch. 3 Attic',
  },
};

export const PET_META: Record<PetKind, { name: string; callout: string }> = {
  ginger_cat: { name: 'Ginger Cat', callout: 'Purr~ ♥' },
  shiba_pup: { name: 'Shiba Pup', callout: 'Woof! ♥' },
  lop_bunny: { name: 'Lop Bunny', callout: 'Hop! ♥' },
};

export function createDefaultHavenProgress(): HavenProgress {
  return {
    activeChapter: 'cottage_living',
    activePet: 'ginger_cat',
    rooms: {
      cottage_living: {},
      zen_garden: {},
      rainy_conservatory: {},
    },
  };
}

export function getSlotCost(slotId: FurnitureSlotId): number {
  return FURNITURE_SLOTS.find((s) => s.id === slotId)?.cost ?? 1;
}

export function getRoomCompletion(
  haven: HavenProgress,
  chapter: HavenChapterId
): { unlocked: number; total: number; pct: number } {
  const map = haven.rooms[chapter] ?? {};
  const unlocked = FURNITURE_SLOTS.filter((s) => Boolean(map[s.id])).length;
  const total = FURNITURE_SLOTS.length;
  return {
    unlocked,
    total,
    pct: Math.round((unlocked / total) * 100),
  };
}

export function countUnlockedFurniture(haven: HavenProgress): number {
  return (
    Object.keys(haven.rooms.cottage_living ?? {}).length +
    Object.keys(haven.rooms.zen_garden ?? {}).length +
    Object.keys(haven.rooms.rainy_conservatory ?? {}).length
  );
}

export function countCompletedChapters(haven: HavenProgress): number {
  const chapters: HavenChapterId[] = [
    'cottage_living',
    'zen_garden',
    'rainy_conservatory',
  ];
  return chapters.filter((ch) => {
    const comp = getRoomCompletion(haven, ch);
    return comp.unlocked >= comp.total;
  }).length;
}

export interface PurchaseResult {
  success: boolean;
  reason?: 'insufficient_stars';
  nextStars: number;
  nextHaven: HavenProgress;
  wasFirstUnlock: boolean;
}

/**
 * Unlocks a furniture hotspot (spending Cozy Stars on first unlock)
 * or updates its aesthetic style for free once unlocked.
 */
export function applyFurnitureStyle(
  haven: HavenProgress,
  cozyStars: number,
  chapter: HavenChapterId,
  slotId: FurnitureSlotId,
  styleId: FurnitureStyleId
): PurchaseResult {
  const roomMap = haven.rooms[chapter] ?? {};
  const alreadyUnlocked = Boolean(roomMap[slotId]);
  const cost = alreadyUnlocked ? 0 : getSlotCost(slotId);

  if (cozyStars < cost) {
    return {
      success: false,
      reason: 'insufficient_stars',
      nextStars: cozyStars,
      nextHaven: haven,
      wasFirstUnlock: false,
    };
  }

  return {
    success: true,
    nextStars: cozyStars - cost,
    wasFirstUnlock: !alreadyUnlocked,
    nextHaven: {
      ...haven,
      rooms: {
        ...haven.rooms,
        [chapter]: {
          ...roomMap,
          [slotId]: styleId,
        },
      },
    },
  };
}

export type PetIdleAction = 'stretch' | 'groom' | 'ear_flick';

export const PET_IDLE_ACTIONS: readonly PetIdleAction[] = [
  'stretch',
  'groom',
  'ear_flick',
];

export const HAVEN_IDLE_THRESHOLD_MS = 10_000;

export const PET_IDLE_DURATION_MS: Record<PetIdleAction, number> = {
  stretch: 2200,
  groom: 2400,
  ear_flick: 1400,
};

/**
 * Picks one of the 3 cozy idle animations ('stretch', 'groom', 'ear_flick'),
 * avoiding repeating the immediately previous animation when possible.
 */
export function pickRandomPetIdleAction(
  previousAction?: PetIdleAction | null,
  roll: number = Math.random()
): PetIdleAction {
  const candidates = previousAction
    ? PET_IDLE_ACTIONS.filter((a) => a !== previousAction)
    : PET_IDLE_ACTIONS;
  const clamped = Math.min(0.999999, Math.max(0, roll));
  const idx = Math.floor(clamped * candidates.length);
  return candidates[idx] ?? 'stretch';
}

