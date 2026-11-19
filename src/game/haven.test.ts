import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFurnitureStyle,
  createDefaultHavenProgress,
  FURNITURE_SLOTS,
  getRoomCompletion,
  HAVEN_IDLE_THRESHOLD_MS,
  PET_IDLE_ACTIONS,
  pickRandomPetIdleAction,
} from './haven';

test('FURNITURE_SLOTS defines 8 unique hotspots per chapter', () => {
  assert.equal(FURNITURE_SLOTS.length, 8);
  const ids = new Set(FURNITURE_SLOTS.map((s) => s.id));
  assert.equal(ids.size, 8);
});

test('applyFurnitureStyle spends Cozy Stars on first unlock and allows free style swaps afterward', () => {
  const haven0 = createDefaultHavenProgress();

  // Sofa costs 1 star
  const res1 = applyFurnitureStyle(haven0, 2, 'cottage_living', 'sofa', 'cottage_oak');
  assert.equal(res1.success, true);
  assert.equal(res1.wasFirstUnlock, true);
  assert.equal(res1.nextStars, 1);
  assert.equal(res1.nextHaven.rooms.cottage_living.sofa, 'cottage_oak');

  // Restyling already-unlocked sofa costs 0 stars
  const res2 = applyFurnitureStyle(
    res1.nextHaven,
    res1.nextStars,
    'cottage_living',
    'sofa',
    'starlight_velvet'
  );
  assert.equal(res2.success, true);
  assert.equal(res2.wasFirstUnlock, false);
  assert.equal(res2.nextStars, 1);
  assert.equal(res2.nextHaven.rooms.cottage_living.sofa, 'starlight_velvet');

  // Fireplace costs 2 stars — fails cleanly when player only has 1 star
  const resFail = applyFurnitureStyle(
    res2.nextHaven,
    res2.nextStars,
    'cottage_living',
    'hearth',
    'minimalist_zen'
  );
  assert.equal(resFail.success, false);
  assert.equal(resFail.reason, 'insufficient_stars');
  assert.equal(resFail.nextStars, 1);
});

test('getRoomCompletion computes accurate restored percentage across 8 hotspots', () => {
  let haven = createDefaultHavenProgress();
  let stars = 20;
  for (let i = 0; i < 4; i++) {
    const out = applyFurnitureStyle(
      haven,
      stars,
      'zen_garden',
      FURNITURE_SLOTS[i].id,
      'minimalist_zen'
    );
    haven = out.nextHaven;
    stars = out.nextStars;
  }
  const comp = getRoomCompletion(haven, 'zen_garden');
  assert.equal(comp.unlocked, 4);
  assert.equal(comp.total, 8);
  assert.equal(comp.pct, 50);
});

test('pickRandomPetIdleAction returns stretch, groom, or ear_flick and avoids immediate repeats', () => {
  assert.equal(HAVEN_IDLE_THRESHOLD_MS, 10_000);
  assert.deepEqual(PET_IDLE_ACTIONS, ['stretch', 'groom', 'ear_flick']);

  assert.equal(pickRandomPetIdleAction(null, 0.0), 'stretch');
  assert.equal(pickRandomPetIdleAction(null, 0.5), 'groom');
  assert.equal(pickRandomPetIdleAction(null, 0.99), 'ear_flick');

  // When previous action was 'stretch', candidates are ['groom', 'ear_flick']
  assert.equal(pickRandomPetIdleAction('stretch', 0.1), 'groom');
  assert.equal(pickRandomPetIdleAction('stretch', 0.9), 'ear_flick');
  assert.notEqual(pickRandomPetIdleAction('groom', 0.0), 'groom');
});

