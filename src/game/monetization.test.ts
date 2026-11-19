import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFurnitureStyle, countUnlockedFurniture, createDefaultHavenProgress, FURNITURE_SLOTS } from './haven';
import {
  canAutoShowDailyStreakPopup,
  canClaimDailyStreak,
  claimDailyStreakReward,
  computeStoryVictoryGemDrop,
  createDefaultMonetizationState,
  DAILY_PUZZLE_COMPLETION_GEMS,
  DAILY_STREAK_REWARDS,
  formatDailyShareCard,
  getDailyPuzzleSeed,
  isDailyPuzzleSeed,
  RATE_US_FURNITURE_THRESHOLD,
  recordDailyPuzzleRun,
  requestAdConsent,
  restorePlayStorePurchases,
  shouldTriggerRateUsPrompt,
  shouldTriggerSmartStarterOffer,
  showRewardedAd,
  STORY_WIN_GEMS_MASTER_TRIAL,
  STORY_WIN_GEMS_STANDARD,
  subscribeRewardedAd,
} from './monetization';
import { applyReviveClear3x3, createEmptyGrid } from './solver';

test('production/non-native rewarded ads fail closed while VIP rewards remain available', async () => {
  const seenStates: string[] = [];
  const unsub = subscribeRewardedAd((status) => {
    seenStates.push(status ? status.rewardType : 'closed');
  });

  // Node test runs do not have Vite DEV mode or a native AdMob runtime.
  // They must never receive a simulated reward.
  const unavailableResult = await showRewardedAd('UNDO', { durationMs: 60 });
  assert.equal(unavailableResult.rewarded, false);
  assert.equal(unavailableResult.rewardType, 'UNDO');
  assert.equal(unavailableResult.skippedAsVip, false);
  assert.deepEqual(seenStates, []);

  const vipResult = await showRewardedAd('DOUBLE_STARS', { noAdsOwned: true });
  assert.equal(vipResult.rewarded, true);
  assert.equal(vipResult.rewardType, 'DOUBLE_STARS');
  assert.equal(vipResult.skippedAsVip, true);

  unsub();
});

test('Daily login reward uses non-punitive pause-and-resume progression when days are missed', () => {
  const s0 = createDefaultMonetizationState();
  assert.equal(canClaimDailyStreak(s0, '2026-11-10'), true);
  assert.equal(canAutoShowDailyStreakPopup(s0, 1, '2026-11-10'), false);
  assert.equal(canAutoShowDailyStreakPopup(s0, 2, '2026-11-10'), true);

  const totalWeeklyStars = DAILY_STREAK_REWARDS.reduce((sum, r) => sum + r.stars, 0);
  assert.equal(totalWeeklyStars, 9);

  const day1 = claimDailyStreakReward(s0, '2026-11-10');
  assert.equal(day1.claimed, true);
  assert.equal(day1.reward?.day, 1);
  assert.equal(day1.nextState.streakCount, 1);

  // Guard same-day claim
  assert.equal(canClaimDailyStreak(day1.nextState, '2026-11-10'), false);
  assert.equal(canAutoShowDailyStreakPopup(day1.nextState, 2, '2026-11-10'), false);
  const dup = claimDailyStreakReward(day1.nextState, '2026-11-10');
  assert.equal(dup.claimed, false);

  // Consecutive next day
  const day2 = claimDailyStreakReward(day1.nextState, '2026-11-11');
  assert.equal(day2.claimed, true);
  assert.equal(day2.reward?.day, 2);
  assert.equal(day2.nextState.streakCount, 2);

  // Missed days pause and resume at Day 3 instead of resetting to Day 1
  const resumed = claimDailyStreakReward(day2.nextState, '2026-11-15');
  assert.equal(resumed.claimed, true);
  assert.equal(resumed.reward?.day, 3);
  assert.equal(resumed.nextState.streakCount, 3);

  // Daily puzzle seed and spoiler-free share card formatting
  const dailySeed = getDailyPuzzleSeed('2026-11-18');
  assert.equal(dailySeed, 'DAILY-2026-11-18');
  assert.equal(isDailyPuzzleSeed(dailySeed), true);
  const card = formatDailyShareCard({
    seedCode: dailySeed,
    score: 1450,
    linesCleared: 8,
    bestCombo: 4,
    playUrl: 'https://havenblocks.app/?duel=DAILY-2026-11-18',
  });
  assert.ok(card.includes('HavenBlocks Daily 2026-11-18'));
  assert.ok(card.includes('Play this same board:'));
});

test('Gameplay Gem progression awards Cozy Gems on Story wins and first Daily Puzzle completion', () => {
  assert.equal(computeStoryVictoryGemDrop(1, 'normal'), STORY_WIN_GEMS_STANDARD);
  assert.equal(computeStoryVictoryGemDrop(6, 'bonus_bloom'), STORY_WIN_GEMS_STANDARD);
  assert.equal(computeStoryVictoryGemDrop(5, 'master_trial'), STORY_WIN_GEMS_MASTER_TRIAL);
  assert.equal(computeStoryVictoryGemDrop(10), STORY_WIN_GEMS_MASTER_TRIAL);

  const firstRun = recordDailyPuzzleRun({
    seedCode: 'DAILY-2026-11-18',
    score: 1850,
    completedDailyDates: [],
    dailyBestScore: 1200,
  });
  assert.equal(firstRun.isDaily, true);
  assert.equal(firstRun.firstCompletionToday, true);
  assert.equal(firstRun.gemsEarned, DAILY_PUZZLE_COMPLETION_GEMS);
  assert.deepEqual(firstRun.nextCompletedDailyDates, ['2026-11-18']);
  assert.equal(firstRun.nextDailyBestScore, 1850);

  // Second run on the same day updates best score if higher, but does not duplicate daily gem grant
  const secondRun = recordDailyPuzzleRun({
    seedCode: 'DAILY-2026-11-18',
    score: 2100,
    completedDailyDates: firstRun.nextCompletedDailyDates,
    dailyBestScore: firstRun.nextDailyBestScore,
  });
  assert.equal(secondRun.firstCompletionToday, false);
  assert.equal(secondRun.gemsEarned, 0);
  assert.equal(secondRun.nextDailyBestScore, 2100);
});

test('applyReviveClear3x3 clears active tiles in 3x3 zone without deleting blocked obstacles', () => {
  const grid = createEmptyGrid();
  grid[3][3] = { kind: 'blocked', material: 'honey_oak', uid: 'blk_3_3' };
  grid[2][2] = { kind: 'tile', material: 'sea_glass', uid: 't_2_2' };
  grid[2][3] = { kind: 'tile', material: 'honey_oak', uid: 't_2_3' };
  grid[4][4] = { kind: 'moss', material: 'woven_rattan', uid: 'm_4_4' };
  grid[0][0] = { kind: 'tile', material: 'glazed_ceramic', uid: 'outside' };

  const { nextGrid, clearedCells } = applyReviveClear3x3(grid);
  assert.equal(clearedCells.length, 3);
  assert.equal(nextGrid[3][3]?.kind, 'blocked');
  assert.equal(nextGrid[2][2], null);
  assert.equal(nextGrid[2][3], null);
  assert.equal(nextGrid[4][4], null);
  assert.equal(nextGrid[0][0]?.uid, 'outside');
});

test('Smart Starter Bundle offer only triggers after unlocking 3 furniture items and fires only once', () => {
  let haven = createDefaultHavenProgress();
  let stars = 20;
  const mon0 = createDefaultMonetizationState();

  assert.equal(countUnlockedFurniture(haven), 0);
  assert.equal(shouldTriggerSmartStarterOffer(0, mon0), false);

  // Unlock 1st and 2nd furniture items -> still below threshold (3)
  for (let i = 0; i < 2; i++) {
    const res = applyFurnitureStyle(
      haven,
      stars,
      'cottage_living',
      FURNITURE_SLOTS[i].id,
      'cottage_oak'
    );
    haven = res.nextHaven;
    stars = res.nextStars;
  }
  assert.equal(countUnlockedFurniture(haven), 2);
  assert.equal(shouldTriggerSmartStarterOffer(countUnlockedFurniture(haven), mon0), false);

  // Unlock 3rd furniture item -> triggers once!
  const res3 = applyFurnitureStyle(
    haven,
    stars,
    'cottage_living',
    FURNITURE_SLOTS[2].id,
    'cottage_oak'
  );
  haven = res3.nextHaven;
  assert.equal(countUnlockedFurniture(haven), 3);
  assert.equal(shouldTriggerSmartStarterOffer(countUnlockedFurniture(haven), mon0), true);

  // Once marked shown or purchased, never triggers again
  assert.equal(
    shouldTriggerSmartStarterOffer(3, { ...mon0, starterOfferShown: true }),
    false
  );
  assert.equal(
    shouldTriggerSmartStarterOffer(3, { ...mon0, noAdsBundlePurchased: true }),
    false
  );
});

test('Rate Us triggers strictly once on 4th Cozy Room furniture upgrade and never after a loss', () => {
  const mon0 = createDefaultMonetizationState();
  assert.equal(RATE_US_FURNITURE_THRESHOLD, 4);
  assert.equal(shouldTriggerRateUsPrompt(3, mon0, 'haven_upgrade'), false);
  assert.equal(shouldTriggerRateUsPrompt(4, mon0, 'loss'), false);
  assert.equal(shouldTriggerRateUsPrompt(4, mon0, 'haven_upgrade'), true);
  assert.equal(
    shouldTriggerRateUsPrompt(4, { ...mon0, ratingPromptShown: true }, 'haven_upgrade'),
    false
  );
});

test('requestAdConsent and restorePlayStorePurchases return Play Store compliance statuses', async () => {
  const consent = await requestAdConsent();
  assert.equal(consent.consentObtained, false);
  assert.equal(consent.canRequestAds, false);
  assert.equal(consent.provider, 'unavailable');

  const mon0 = createDefaultMonetizationState();
  const none = restorePlayStorePurchases(mon0);
  assert.equal(none.restoredNoAdsBundle, false);

  const active = restorePlayStorePurchases({ ...mon0, noAdsBundlePurchased: true });
  assert.equal(active.restoredNoAdsBundle, true);
});



