import type { SeededRng } from './shapes';
import type {
  HerbariumCardDef,
  HerbariumCategory,
  HerbariumProgress,
  HerbariumRarity,
  PetAccessoryId,
} from './types';

export const HERBARIUM_CATEGORY_META: Record<
  HerbariumCategory,
  { label: string; description: string }
> = {
  botanicals: {
    label: 'Botanicals',
    description: 'Pressed woodland leaves, herbs & cottage blooms',
  },
  teacups: {
    label: 'Vintage Teacups',
    description: 'Hand-glazed porcelain & artisan studio vessels',
  },
  pet_moments: {
    label: 'Pet Moments',
    description: 'Polaroid sketches of your cozy companions',
  },
};

export const HERBARIUM_CARDS: HerbariumCardDef[] = [
  // 8 Botanicals
  {
    id: 'bot_chamomile',
    number: 1,
    category: 'botanicals',
    rarity: 'common',
    title: 'Sunlit Chamomile',
    latinOrNote: 'Matricaria chamomilla',
    bgHex: '#FBF3DC',
    accentHex: '#F59E0B',
    trimHex: '#4D7C57',
  },
  {
    id: 'bot_lavender',
    number: 2,
    category: 'botanicals',
    rarity: 'common',
    title: 'Cottage Lavender',
    latinOrNote: 'Lavandula angustifolia',
    bgHex: '#F3EEFA',
    accentHex: '#7E57C2',
    trimHex: '#557A60',
  },
  {
    id: 'bot_fern',
    number: 3,
    category: 'botanicals',
    rarity: 'common',
    title: 'Pressed Maidenhair',
    latinOrNote: 'Adiantum pedatum',
    bgHex: '#EAF4EC',
    accentHex: '#2F6F4E',
    trimHex: '#7A5C3E',
  },
  {
    id: 'bot_clover',
    number: 4,
    category: 'botanicals',
    rarity: 'rare',
    title: 'Four-Leaf Clover',
    latinOrNote: 'Lucky Patio Specimen',
    bgHex: '#E9F5E8',
    accentHex: '#15803D',
    trimHex: '#C28B2C',
  },
  {
    id: 'bot_maple',
    number: 5,
    category: 'botanicals',
    rarity: 'common',
    title: 'Autumn Maple Leaf',
    latinOrNote: 'Acer palmatum',
    bgHex: '#FCEFE6',
    accentHex: '#C2410C',
    trimHex: '#78350F',
  },
  {
    id: 'bot_sakura',
    number: 6,
    category: 'botanicals',
    rarity: 'rare',
    title: 'Kyoto Cherry Blossom',
    latinOrNote: 'Prunus serrulata',
    bgHex: '#FDF0F4',
    accentHex: '#E11D48',
    trimHex: '#6D4C3D',
  },
  {
    id: 'bot_ginkgo',
    number: 7,
    category: 'botanicals',
    rarity: 'rare',
    title: 'Golden Ginkgo Fan',
    latinOrNote: 'Ginkgo biloba',
    bgHex: '#FDF8DF',
    accentHex: '#D97706',
    trimHex: '#4E6B50',
  },
  {
    id: 'bot_moonflower',
    number: 8,
    category: 'botanicals',
    rarity: 'heirloom',
    title: 'Candlelight Moonflower',
    latinOrNote: 'Ipomoea alba · Rare Night Bloom',
    bgHex: '#EAEDF8',
    accentHex: '#3B4270',
    trimHex: '#E2B659',
  },

  // 8 Vintage Teacups
  {
    id: 'cup_celadon',
    number: 9,
    category: 'teacups',
    rarity: 'common',
    title: 'Celadon Jade Cup',
    latinOrNote: 'Crackle-Glaze Porcelain',
    bgHex: '#EBF5F2',
    accentHex: '#2C8C7C',
    trimHex: '#B4833E',
  },
  {
    id: 'cup_daisy',
    number: 10,
    category: 'teacups',
    rarity: 'common',
    title: 'Meadow Daisy Saucer',
    latinOrNote: '1920s English Bone China',
    bgHex: '#FBF5E8',
    accentHex: '#D97706',
    trimHex: '#3F6B4E',
  },
  {
    id: 'cup_matcha',
    number: 11,
    category: 'teacups',
    rarity: 'rare',
    title: 'Hand-Thrown Chawan',
    latinOrNote: 'Kyoto Tea Ceremony Bowl',
    bgHex: '#EEF2EA',
    accentHex: '#557A57',
    trimHex: '#8B5E34',
  },
  {
    id: 'cup_honey',
    number: 12,
    category: 'teacups',
    rarity: 'common',
    title: 'Amber Honey Mug',
    latinOrNote: 'Warm Stoneware Potter’s Mark',
    bgHex: '#FCF2E4',
    accentHex: '#B45309',
    trimHex: '#7C2D12',
  },
  {
    id: 'cup_rosehip',
    number: 13,
    category: 'teacups',
    rarity: 'common',
    title: 'Rosehip & Gold Rim',
    latinOrNote: 'Hand-Painted Blossom Trim',
    bgHex: '#FBEFF1',
    accentHex: '#BE123C',
    trimHex: '#D9A441',
  },
  {
    id: 'cup_indigo',
    number: 14,
    category: 'teacups',
    rarity: 'rare',
    title: 'Indigo Willow Ware',
    latinOrNote: 'Cobalt Blue Transferware',
    bgHex: '#ECF1FA',
    accentHex: '#1D4ED8',
    trimHex: '#334155',
  },
  {
    id: 'cup_terracotta',
    number: 15,
    category: 'teacups',
    rarity: 'rare',
    title: 'Terracotta Kettle Pot',
    latinOrNote: 'Unglazed Clay Infuser',
    bgHex: '#F9EEE8',
    accentHex: '#C2410C',
    trimHex: '#4B644A',
  },
  {
    id: 'cup_starlight',
    number: 16,
    category: 'teacups',
    rarity: 'heirloom',
    title: 'Starlight Astral Service',
    latinOrNote: 'Midnight Enamel & Brass Filigree',
    bgHex: '#ECEEF8',
    accentHex: '#312E81',
    trimHex: '#F59E0B',
  },

  // 8 Pet Moments
  {
    id: 'pet_sunbeam',
    number: 17,
    category: 'pet_moments',
    rarity: 'common',
    title: 'Afternoon Sunbeam Nap',
    latinOrNote: 'Curled on the oak rug',
    bgHex: '#FDF4E3',
    accentHex: '#EA8C2A',
    trimHex: '#9A4E0B',
  },
  {
    id: 'pet_yarn',
    number: 18,
    category: 'pet_moments',
    rarity: 'common',
    title: 'Tangled Sage Yarn',
    latinOrNote: 'Caught mid-pounce',
    bgHex: '#EDF4EE',
    accentHex: '#3F6B4E',
    trimHex: '#D97706',
  },
  {
    id: 'pet_window',
    number: 19,
    category: 'pet_moments',
    rarity: 'common',
    title: 'Rainy Window Watch',
    latinOrNote: 'Counting raindrops on glass',
    bgHex: '#EAF2F8',
    accentHex: '#0F766E',
    trimHex: '#64748B',
  },
  {
    id: 'pet_hearth',
    number: 20,
    category: 'pet_moments',
    rarity: 'rare',
    title: 'Fireside Biscuit Time',
    latinOrNote: 'Warm paws by the embers',
    bgHex: '#FCEFE6',
    accentHex: '#EA580C',
    trimHex: '#78350F',
  },
  {
    id: 'pet_koi',
    number: 21,
    category: 'pet_moments',
    rarity: 'rare',
    title: 'Koi Pond Curiosity',
    latinOrNote: 'Ripples in the Zen garden',
    bgHex: '#E8F6F5',
    accentHex: '#0D9488',
    trimHex: '#F97316',
  },
  {
    id: 'pet_teatime',
    number: 22,
    category: 'pet_moments',
    rarity: 'common',
    title: 'Teacup Inspector',
    latinOrNote: 'Sniffing fresh chamomile steam',
    bgHex: '#F9F3E7',
    accentHex: '#B45309',
    trimHex: '#3F6B4E',
  },
  {
    id: 'pet_books',
    number: 23,
    category: 'pet_moments',
    rarity: 'rare',
    title: 'Bookshop Guardian',
    latinOrNote: 'Perched atop botanical folios',
    bgHex: '#F3EEE7',
    accentHex: '#7C4716',
    trimHex: '#1E3A2F',
  },
  {
    id: 'pet_fireflies',
    number: 24,
    category: 'pet_moments',
    rarity: 'heirloom',
    title: 'Firefly Lantern Chase',
    latinOrNote: 'Midnight garden magic',
    bgHex: '#EAEAF7',
    accentHex: '#3730A3',
    trimHex: '#FBBF24',
  },
];

export interface PetAccessoryDef {
  id: PetAccessoryId;
  name: string;
  description: string;
  costLeaves: number;
  swatchHex: string;
}

export const PET_ACCESSORIES: PetAccessoryDef[] = [
  {
    id: 'bell_collar',
    name: 'Bell Collar',
    description: 'Crimson ribbon with a polished brass jingle bell',
    costLeaves: 2,
    swatchHex: '#DC2626',
  },
  {
    id: 'bow_tie',
    name: 'Bow Tie',
    description: 'Dapper sage-green linen bow tie',
    costLeaves: 2,
    swatchHex: '#1E3A2F',
  },
  {
    id: 'scarf',
    name: 'Cozy Scarf',
    description: 'Hand-knitted autumn amber wool scarf',
    costLeaves: 3,
    swatchHex: '#D97706',
  },
  {
    id: 'glasses',
    name: 'Brass Glasses',
    description: 'Round scholarly reading spectacles',
    costLeaves: 3,
    swatchHex: '#CA8A04',
  },
  {
    id: 'flower_crown',
    name: 'Flower Crown',
    description: 'Braided daisies & clover blossoms',
    costLeaves: 4,
    swatchHex: '#EC4899',
  },
  {
    id: 'wizard_hat',
    name: 'Wizard Hat',
    description: 'Starlight velvet hat with golden moon trim',
    costLeaves: 5,
    swatchHex: '#3B4270',
  },
];

export const DUPLICATE_LEAF_VALUE: Record<HerbariumRarity, number> = {
  common: 1,
  rare: 2,
  heirloom: 3,
};

export function createDefaultHerbariumProgress(): HerbariumProgress {
  return {
    unlockedCardIds: [],
    cardCounts: {},
    seedPacks: 1, // Welcome Seed Pack so players can discover the Herbarium immediately
    goldenLeaves: 0,
    unlockedAccessories: [],
    equippedAccessory: null,
    storyWinsCount: 0,
  };
}

/**
 * Awards 1 Seed Pack every 3 Story level victories.
 */
export function shouldAwardSeedPack(nextStoryWinsCount: number): boolean {
  return nextStoryWinsCount > 0 && nextStoryWinsCount % 3 === 0;
}

export interface DrawnCardEntry {
  card: HerbariumCardDef;
  isDuplicate: boolean;
  leavesGained: number;
}

export interface SeedPackOpenResult {
  opened: boolean;
  drawn: DrawnCardEntry[];
  totalLeavesGained: number;
  nextHerbarium: HerbariumProgress;
}

/**
 * Opens 1 Seed Pack -> draws 3 Herbarium cards.
 * Duplicate cards convert directly into Golden Leaves used to unlock Pet Accessories.
 */
export function openSeedPack(
  herbarium: HerbariumProgress,
  rng?: Pick<SeededRng, 'next'>
): SeedPackOpenResult {
  if (herbarium.seedPacks <= 0) {
    return {
      opened: false,
      drawn: [],
      totalLeavesGained: 0,
      nextHerbarium: herbarium,
    };
  }

  const nextUnlocked = new Set(herbarium.unlockedCardIds);
  const nextCounts: Record<string, number> = { ...herbarium.cardCounts };
  const drawn: DrawnCardEntry[] = [];
  let totalLeavesGained = 0;

  const commonCards = HERBARIUM_CARDS.filter((c) => c.rarity === 'common');
  const rareCards = HERBARIUM_CARDS.filter((c) => c.rarity === 'rare');
  const heirloomCards = HERBARIUM_CARDS.filter((c) => c.rarity === 'heirloom');

  const roll = () => (rng ? rng.next() : Math.random());

  for (let i = 0; i < 3; i++) {
    const r = roll();
    let pool = commonCards;
    if (r >= 0.88 && heirloomCards.length > 0) {
      pool = heirloomCards;
    } else if (r >= 0.56 && rareCards.length > 0) {
      pool = rareCards;
    }

    // Attainable 24-card collection: prefer unowned cards in the rolled tier,
    // and fall back to any remaining unowned card across the 24-card catalog
    // before rolling duplicates.
    const unownedInPool = pool.filter((c) => !nextUnlocked.has(c.id));
    const allUnowned = HERBARIUM_CARDS.filter((c) => !nextUnlocked.has(c.id));
    const pickPool =
      unownedInPool.length > 0
        ? unownedInPool
        : allUnowned.length > 0
          ? allUnowned
          : pool;
    const picked =
      pickPool[Math.floor(roll() * pickPool.length)] ?? HERBARIUM_CARDS[0];

    const isDuplicate = nextUnlocked.has(picked.id);
    const leavesGained = isDuplicate ? DUPLICATE_LEAF_VALUE[picked.rarity] : 0;

    nextUnlocked.add(picked.id);
    nextCounts[picked.id] = (nextCounts[picked.id] ?? 0) + 1;
    totalLeavesGained += leavesGained;
    drawn.push({ card: picked, isDuplicate, leavesGained });
  }

  return {
    opened: true,
    drawn,
    totalLeavesGained,
    nextHerbarium: {
      ...herbarium,
      seedPacks: herbarium.seedPacks - 1,
      unlockedCardIds: Array.from(nextUnlocked),
      cardCounts: nextCounts,
      goldenLeaves: herbarium.goldenLeaves + totalLeavesGained,
    },
  };
}

export interface AccessoryActionResult {
  success: boolean;
  reason?: 'insufficient_leaves';
  nextHerbarium: HerbariumProgress;
  unlockedNew: boolean;
}

export function unlockOrTogglePetAccessory(
  herbarium: HerbariumProgress,
  accessoryId: PetAccessoryId
): AccessoryActionResult {
  const alreadyUnlocked = herbarium.unlockedAccessories.includes(accessoryId);
  const def = PET_ACCESSORIES.find((a) => a.id === accessoryId);
  if (!def) {
    return { success: false, nextHerbarium: herbarium, unlockedNew: false };
  }

  if (alreadyUnlocked) {
    const isEquipped = herbarium.equippedAccessory === accessoryId;
    return {
      success: true,
      unlockedNew: false,
      nextHerbarium: {
        ...herbarium,
        equippedAccessory: isEquipped ? null : accessoryId,
      },
    };
  }

  if (herbarium.goldenLeaves < def.costLeaves) {
    return {
      success: false,
      reason: 'insufficient_leaves',
      nextHerbarium: herbarium,
      unlockedNew: false,
    };
  }

  return {
    success: true,
    unlockedNew: true,
    nextHerbarium: {
      ...herbarium,
      goldenLeaves: herbarium.goldenLeaves - def.costLeaves,
      unlockedAccessories: [...herbarium.unlockedAccessories, accessoryId],
      equippedAccessory: accessoryId,
    },
  };
}
