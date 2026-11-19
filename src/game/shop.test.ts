import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultHavenProgress } from './haven';
import { createDefaultHerbariumProgress } from './herbarium';
import {
  createDefaultMonetizationState,
  purchaseStoreProduct,
} from './monetization';
import {
  applyStoreProductFulfillment,
  FREE_GEMS_AD_AMOUNT,
  GEM_SHOP_ITEMS,
  grantFreeAdGems,
  isPremiumItemOwned,
  purchaseGemShopItem,
  SHOP_BUNDLES,
  SHOP_GEM_PACKS,
  type ShopAccountSnapshot,
} from './shop';
import { createDefaultPersistedState, normalizePersistedState, STARTING_COZY_GEMS } from './storage';

function makeSnapshot(overrides?: Partial<ShopAccountSnapshot>): ShopAccountSnapshot {
  return {
    cozyGems: STARTING_COZY_GEMS,
    unlockedPremiumItems: [],
    activeTileSkin: 'classic',
    activeWindowTheme: 'classic',
    undoCharges: 1,
    rotateCharges: 1,
    monetization: createDefaultMonetizationState(),
    haven: createDefaultHavenProgress(),
    herbarium: createDefaultHerbariumProgress(),
    ...overrides,
  };
}

test('Shop catalog matches required Bundles, Gem Packs, and Gem Shop items', () => {
  assert.equal(SHOP_BUNDLES.length, 2);
  assert.equal(SHOP_BUNDLES[0].priceLabel, '$3.99');
  assert.equal(SHOP_BUNDLES[0].gemsAwarded, 300);
  assert.equal(SHOP_BUNDLES[0].grantsNoAds, true);
  assert.equal(SHOP_BUNDLES[1].priceLabel, '$7.99');
  assert.equal(SHOP_BUNDLES[1].gemsAwarded, 800);
  assert.equal(SHOP_BUNDLES[1].grantsUndos, 5);

  assert.equal(SHOP_GEM_PACKS.length, 4);
  assert.deepEqual(
    SHOP_GEM_PACKS.map((p) => p.gems),
    [80, 450, 1000, 2400]
  );
  assert.equal(
    SHOP_GEM_PACKS.find((p) => p.gems === 450)?.badge,
    'Best Value'
  );
  assert.equal(FREE_GEMS_AD_AMOUNT, 10);

  assert.equal(GEM_SHOP_ITEMS.length, 6);
  const prices = Object.fromEntries(GEM_SHOP_ITEMS.map((i) => [i.id, i.costGems]));
  assert.equal(prices.pet_lop_bunny, 150);
  assert.equal(prices.theme_rainy_window, 200);
  assert.equal(prices.skin_golden_lantern, 180);
  assert.equal(prices.refill_undo_3, 40);
  assert.equal(prices.refill_rotate_3, 40);
  assert.equal(prices.mystery_seed_pouch, 60);
});

test('Store bundle fulfillment grants No Ads, Gems, Lop Bunny, Rainy Theme, and Undos', () => {
  const s0 = makeSnapshot();

  const starter = applyStoreProductFulfillment(s0, 'bundle_cozy_starter_v1');
  assert.equal(starter.applied, true);
  assert.equal(starter.next.cozyGems, 350);
  assert.equal(starter.next.monetization.noAdsBundlePurchased, true);
  assert.equal(isPremiumItemOwned(starter.next.unlockedPremiumItems, 'pet_lop_bunny'), true);
  assert.equal(starter.next.haven.activePet, 'lop_bunny');

  const artisan = applyStoreProductFulfillment(starter.next, 'bundle_master_artisan_v1');
  assert.equal(artisan.applied, true);
  assert.equal(artisan.next.cozyGems, 1150);
  assert.equal(artisan.next.undoCharges, 6);
  assert.equal(isPremiumItemOwned(artisan.next.unlockedPremiumItems, 'theme_rainy_window'), true);
  assert.equal(artisan.next.activeWindowTheme, 'rainy_conservatory');
});

test('Gem packs and Watch Ad reward increase Cozy Gems accurately', () => {
  const s0 = makeSnapshot({ cozyGems: 50 });
  const basket = applyStoreProductFulfillment(s0, 'gems_basket_450');
  assert.equal(basket.applied, true);
  assert.equal(basket.next.cozyGems, 500);

  const afterAd = grantFreeAdGems(basket.next.cozyGems);
  assert.equal(afterAd, 510);
});

test('Gem Shop enforces balances, prevents duplicate durable purchases, and equips rewards', () => {
  const lowBalance = makeSnapshot({ cozyGems: 49 });
  const failSeed = purchaseGemShopItem(lowBalance, 'mystery_seed_pouch');
  assert.equal(failSeed.success, false);
  assert.equal(failSeed.reason, 'insufficient_gems');
  assert.equal(failSeed.next.cozyGems, 49);

  // Can afford 40-gem repeatable tactical refill twice after earning more
  const undoRes = purchaseGemShopItem(lowBalance, 'refill_undo_3');
  assert.equal(undoRes.success, true);
  assert.equal(undoRes.next.cozyGems, 9);
  assert.equal(undoRes.next.undoCharges, 4);

  const rich = makeSnapshot({ cozyGems: 600 });
  const skin = purchaseGemShopItem(rich, 'skin_golden_lantern');
  assert.equal(skin.success, true);
  assert.equal(skin.next.cozyGems, 420);
  assert.equal(skin.next.activeTileSkin, 'golden_lantern');

  // Durable cosmetic cannot be bought twice
  const dupSkin = purchaseGemShopItem(skin.next, 'skin_golden_lantern');
  assert.equal(dupSkin.success, false);
  assert.equal(dupSkin.reason, 'already_owned');
  assert.equal(dupSkin.next.cozyGems, 420);

  // Repeatable seed pouch increments seedPacks
  const seed = purchaseGemShopItem(dupSkin.next, 'mystery_seed_pouch');
  assert.equal(seed.success, true);
  assert.equal(seed.next.cozyGems, 360);
  assert.equal(seed.next.herbarium.seedPacks, rich.herbarium.seedPacks + 1);
});

test('purchaseStoreProduct simulates only when dev override / DEV is enabled', async () => {
  const prodRes = await purchaseStoreProduct('gems_pouch_80', {
    devSimulationOverride: false,
    delayMs: 0,
  });
  assert.equal(prodRes.success, false);
  assert.equal(prodRes.simulated, false);

  const devRes = await purchaseStoreProduct('gems_pouch_80', {
    devSimulationOverride: true,
    delayMs: 0,
  });
  assert.equal(devRes.success, true);
  assert.equal(devRes.simulated, true);
});

test('PersistedState save migration seeds 50 starter Cozy Gems and validates unlocked cosmetics', () => {
  const defaults = createDefaultPersistedState();
  assert.equal(defaults.cozyGems, 50);
  assert.deepEqual(defaults.unlockedPremiumItems, []);

  // Legacy v2 save lacking cozyGems migrates cleanly to 50 starter gems
  const migrated = normalizePersistedState({
    version: 2,
    bestScore: 1500,
    unlockedPremiumItems: ['skin_golden_lantern'],
    activeTileSkin: 'golden_lantern',
    activeWindowTheme: 'rainy_conservatory', // not in unlockedPremiumItems -> falls back to classic
  });
  assert.equal(migrated.cozyGems, 50);
  assert.equal(migrated.activeTileSkin, 'golden_lantern');
  assert.equal(migrated.activeWindowTheme, 'classic');
});
