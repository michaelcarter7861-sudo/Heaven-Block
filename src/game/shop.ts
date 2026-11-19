import type {
  GemShopItemId,
  HavenProgress,
  HerbariumProgress,
  MonetizationState,
  StoreProductId,
  TileSkinId,
  WindowThemeId,
} from './types';

export const FREE_GEMS_AD_AMOUNT = 10;

export interface ShopBundleDef {
  productId: StoreProductId;
  name: string;
  priceLabel: string;
  summary: string;
  perks: string[];
  gemsAwarded: number;
  grantsNoAds: boolean;
  grantsUndos: number;
  unlocksItemIds: GemShopItemId[];
  badge?: string;
}

export interface ShopGemPackDef {
  productId: StoreProductId;
  name: string;
  priceLabel: string;
  gems: number;
  badge?: string;
}

export interface GemShopItemDef {
  id: GemShopItemId;
  name: string;
  description: string;
  costGems: number;
  durable: boolean;
  category: 'pet' | 'theme' | 'skin' | 'refill' | 'herbarium';
}

export const SHOP_BUNDLES: readonly ShopBundleDef[] = [
  {
    productId: 'bundle_cozy_starter_v1',
    name: 'Cozy Starter Bundle',
    priceLabel: '$3.99',
    summary: 'No Ads + 300 Gems + Exclusive Lop Bunny Pet',
    perks: [
      'Remove all ad waits — instant VIP rewards',
      '+300 Cozy Gems for exclusive cosmetics & refills',
      'Exclusive Lop Bunny companion unlocked immediately',
    ],
    gemsAwarded: 300,
    grantsNoAds: true,
    grantsUndos: 0,
    unlocksItemIds: ['pet_lop_bunny'],
    badge: 'VIP Starter',
  },
  {
    productId: 'bundle_master_artisan_v1',
    name: 'Master Artisan Pack',
    priceLabel: '$7.99',
    summary: '800 Gems + Rainy Conservatory Theme + 5 Undos',
    perks: [
      '+800 Cozy Gems treasury boost',
      'Rainy Conservatory animated window theme',
      '+5 Tactical Undo charges ready in puzzles',
    ],
    gemsAwarded: 800,
    grantsNoAds: false,
    grantsUndos: 5,
    unlocksItemIds: ['theme_rainy_window'],
    badge: 'Artisan Pick',
  },
];

export const SHOP_GEM_PACKS: readonly ShopGemPackDef[] = [
  {
    productId: 'gems_pouch_80',
    name: 'Pouch of 80 Gems',
    priceLabel: '$0.99',
    gems: 80,
  },
  {
    productId: 'gems_basket_450',
    name: 'Basket of 450 Gems',
    priceLabel: '$4.99',
    gems: 450,
    badge: 'Best Value',
  },
  {
    productId: 'gems_chest_1000',
    name: 'Chest of 1,000 Gems',
    priceLabel: '$9.99',
    gems: 1000,
  },
  {
    productId: 'gems_vault_2400',
    name: 'Vault of 2,400 Gems',
    priceLabel: '$19.99',
    gems: 2400,
  },
];

export const GEM_SHOP_ITEMS: readonly GemShopItemDef[] = [
  {
    id: 'pet_lop_bunny',
    name: 'Exclusive Lop Bunny Pet',
    description: 'Gentle floppy-eared companion for My Haven',
    costGems: 150,
    durable: true,
    category: 'pet',
  },
  {
    id: 'theme_rainy_window',
    name: 'Rainy Night Window Theme',
    description: 'Cozy animated rain streaks & twilight conservatory sky',
    costGems: 200,
    durable: true,
    category: 'theme',
  },
  {
    id: 'skin_golden_lantern',
    name: 'Golden Lantern Tile Skin',
    description: 'Gilded filigree trim on every artisan puzzle block',
    costGems: 180,
    durable: true,
    category: 'skin',
  },
  {
    id: 'refill_undo_3',
    name: '3× Tactical Undo Refill',
    description: 'Rewind up to 3 extra moves immediately',
    costGems: 40,
    durable: false,
    category: 'refill',
  },
  {
    id: 'refill_rotate_3',
    name: '3× Rotate Charge Refill',
    description: 'Spin any piece 90° clockwise 3 extra times',
    costGems: 40,
    durable: false,
    category: 'refill',
  },
  {
    id: 'mystery_seed_pouch',
    name: 'Mystery Herbarium Seed Pouch',
    description: 'Adds +1 collectible Seed Pack (3 botanical cards)',
    costGems: 60,
    durable: false,
    category: 'herbarium',
  },
];

export interface ShopAccountSnapshot {
  cozyGems: number;
  unlockedPremiumItems: string[];
  activeTileSkin: TileSkinId;
  activeWindowTheme: WindowThemeId;
  undoCharges: number;
  rotateCharges: number;
  monetization: MonetizationState;
  haven: HavenProgress;
  herbarium: HerbariumProgress;
}

export function isPremiumItemOwned(
  unlockedPremiumItems: readonly string[],
  itemId: string
): boolean {
  return unlockedPremiumItems.includes(itemId);
}

export function applyStoreProductFulfillment(
  snapshot: ShopAccountSnapshot,
  productId: StoreProductId
): {
  applied: boolean;
  next: ShopAccountSnapshot;
  summary: string;
} {
  const bundle = SHOP_BUNDLES.find((b) => b.productId === productId);
  if (bundle) {
    const nextUnlocked = Array.from(
      new Set([...snapshot.unlockedPremiumItems, ...bundle.unlocksItemIds])
    );
    const unlocksBunny = bundle.unlocksItemIds.includes('pet_lop_bunny');
    const unlocksRainy = bundle.unlocksItemIds.includes('theme_rainy_window');

    return {
      applied: true,
      summary: `${bundle.name} unlocked! +${bundle.gemsAwarded} Gems`,
      next: {
        ...snapshot,
        cozyGems: snapshot.cozyGems + bundle.gemsAwarded,
        unlockedPremiumItems: nextUnlocked,
        undoCharges: snapshot.undoCharges + bundle.grantsUndos,
        activeWindowTheme: unlocksRainy
          ? 'rainy_conservatory'
          : snapshot.activeWindowTheme,
        haven: unlocksBunny
          ? { ...snapshot.haven, activePet: 'lop_bunny' }
          : snapshot.haven,
        monetization: bundle.grantsNoAds
          ? {
              ...snapshot.monetization,
              noAdsBundlePurchased: true,
              starterOfferShown: true,
            }
          : snapshot.monetization,
      },
    };
  }

  const gemPack = SHOP_GEM_PACKS.find((g) => g.productId === productId);
  if (gemPack) {
    return {
      applied: true,
      summary: `+${gemPack.gems.toLocaleString()} Cozy Gems added!`,
      next: {
        ...snapshot,
        cozyGems: snapshot.cozyGems + gemPack.gems,
      },
    };
  }

  return {
    applied: false,
    next: snapshot,
    summary: 'Unknown store product.',
  };
}

export function grantFreeAdGems(
  cozyGems: number,
  amount = FREE_GEMS_AD_AMOUNT
): number {
  return Math.max(0, cozyGems) + Math.max(0, amount);
}

export function purchaseGemShopItem(
  snapshot: ShopAccountSnapshot,
  itemId: GemShopItemId
): {
  success: boolean;
  reason?: 'insufficient_gems' | 'already_owned' | 'not_found';
  next: ShopAccountSnapshot;
  summary: string;
} {
  const item = GEM_SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) {
    return {
      success: false,
      reason: 'not_found',
      next: snapshot,
      summary: 'Item not found in shop.',
    };
  }

  if (
    item.durable &&
    isPremiumItemOwned(snapshot.unlockedPremiumItems, item.id)
  ) {
    return {
      success: false,
      reason: 'already_owned',
      next: snapshot,
      summary: `${item.name} is already owned.`,
    };
  }

  if (snapshot.cozyGems < item.costGems) {
    return {
      success: false,
      reason: 'insufficient_gems',
      next: snapshot,
      summary: `Need ${item.costGems - snapshot.cozyGems} more Cozy Gems.`,
    };
  }

  const nextGems = snapshot.cozyGems - item.costGems;
  const nextUnlocked = item.durable
    ? Array.from(new Set([...snapshot.unlockedPremiumItems, item.id]))
    : snapshot.unlockedPremiumItems;

  switch (item.id) {
    case 'pet_lop_bunny':
      return {
        success: true,
        summary: 'Lop Bunny unlocked & hopped into My Haven!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          unlockedPremiumItems: nextUnlocked,
          haven: { ...snapshot.haven, activePet: 'lop_bunny' },
        },
      };
    case 'theme_rainy_window':
      return {
        success: true,
        summary: 'Rainy Night Window Theme unlocked & equipped!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          unlockedPremiumItems: nextUnlocked,
          activeWindowTheme: 'rainy_conservatory',
        },
      };
    case 'skin_golden_lantern':
      return {
        success: true,
        summary: 'Golden Lantern Tile Skin unlocked & equipped!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          unlockedPremiumItems: nextUnlocked,
          activeTileSkin: 'golden_lantern',
        },
      };
    case 'refill_undo_3':
      return {
        success: true,
        summary: '+3 Tactical Undo charges added!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          undoCharges: snapshot.undoCharges + 3,
        },
      };
    case 'refill_rotate_3':
      return {
        success: true,
        summary: '+3 Rotate charges added!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          rotateCharges: snapshot.rotateCharges + 3,
        },
      };
    case 'mystery_seed_pouch':
      return {
        success: true,
        summary: '+1 Herbarium Seed Pack added to My Haven!',
        next: {
          ...snapshot,
          cozyGems: nextGems,
          herbarium: {
            ...snapshot.herbarium,
            seedPacks: snapshot.herbarium.seedPacks + 1,
          },
        },
      };
  }
}
