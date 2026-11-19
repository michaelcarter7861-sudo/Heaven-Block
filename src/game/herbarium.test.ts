import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultHerbariumProgress,
  HERBARIUM_CARDS,
  openSeedPack,
  PET_ACCESSORIES,
  shouldAwardSeedPack,
  unlockOrTogglePetAccessory,
} from './herbarium';
import { hashSeedCode, mulberry32 } from './shapes';

test('Herbarium defines 24 collectible cards across 3 categories and 6 Pet Accessories', () => {
  assert.equal(HERBARIUM_CARDS.length, 24);
  assert.equal(HERBARIUM_CARDS.filter((c) => c.category === 'botanicals').length, 8);
  assert.equal(HERBARIUM_CARDS.filter((c) => c.category === 'teacups').length, 8);
  assert.equal(HERBARIUM_CARDS.filter((c) => c.category === 'pet_moments').length, 8);
  assert.equal(PET_ACCESSORIES.length, 6);
});

test('shouldAwardSeedPack awards a Seed Pack strictly every 3 Story wins', () => {
  assert.equal(shouldAwardSeedPack(0), false);
  assert.equal(shouldAwardSeedPack(1), false);
  assert.equal(shouldAwardSeedPack(2), false);
  assert.equal(shouldAwardSeedPack(3), true);
  assert.equal(shouldAwardSeedPack(4), false);
  assert.equal(shouldAwardSeedPack(6), true);
  assert.equal(shouldAwardSeedPack(9), true);
});

test('openSeedPack draws 3 cards, converts duplicates into Golden Leaves, and unlocks Pet Accessories', () => {
  let state = {
    ...createDefaultHerbariumProgress(),
    seedPacks: 5,
  };
  const rng = mulberry32(hashSeedCode('HERB-99'));

  const firstPack = openSeedPack(state, rng);
  assert.equal(firstPack.opened, true);
  assert.equal(firstPack.drawn.length, 3);
  state = firstPack.nextHerbarium;
  assert.equal(state.seedPacks, 4);
  assert.ok(state.unlockedCardIds.length >= 1 && state.unlockedCardIds.length <= 3);

  // Pre-own all cards so opening another pack guarantees duplicates -> Golden Leaves
  state = {
    ...state,
    unlockedCardIds: HERBARIUM_CARDS.map((c) => c.id),
    goldenLeaves: 0,
  };
  const dupPack = openSeedPack(state, rng);
  assert.equal(dupPack.opened, true);
  assert.equal(dupPack.drawn.every((d) => d.isDuplicate), true);
  assert.ok(dupPack.totalLeavesGained >= 3);
  state = dupPack.nextHerbarium;

  // Unlocking bell_collar costs 2 Golden Leaves and auto-equips it
  const unlockRes = unlockOrTogglePetAccessory(state, 'bell_collar');
  assert.equal(unlockRes.success, true);
  assert.equal(unlockRes.unlockedNew, true);
  assert.equal(unlockRes.nextHerbarium.equippedAccessory, 'bell_collar');
  assert.equal(unlockRes.nextHerbarium.goldenLeaves, state.goldenLeaves - 2);

  // Toggling equipped accessory removes it without charging again
  const toggleOff = unlockOrTogglePetAccessory(unlockRes.nextHerbarium, 'bell_collar');
  assert.equal(toggleOff.success, true);
  assert.equal(toggleOff.unlockedNew, false);
  assert.equal(toggleOff.nextHerbarium.equippedAccessory, null);
  assert.equal(toggleOff.nextHerbarium.goldenLeaves, unlockRes.nextHerbarium.goldenLeaves);
});

test('openSeedPack guarantees steady collection progress so 8 packs unlock all 24 cards', () => {
  let state = {
    ...createDefaultHerbariumProgress(),
    seedPacks: 8,
  };
  const rng = mulberry32(hashSeedCode('ATTAINABLE-24'));
  for (let i = 0; i < 8; i++) {
    const res = openSeedPack(state, rng);
    assert.equal(res.opened, true);
    state = res.nextHerbarium;
  }
  assert.equal(state.unlockedCardIds.length, 24);
});
