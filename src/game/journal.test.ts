import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFurnitureStyle, createDefaultHavenProgress, FURNITURE_SLOTS } from './haven';
import { createDefaultHerbariumProgress } from './herbarium';
import {
  buildDailyCalendarMonth,
  canGiveDailyPetTreat,
  claimMilestoneReward,
  computeMonthlyTrophyTier,
  createDefaultLifetimeStats,
  createDefaultPetBondState,
  evaluateMilestones,
  filterMilestonesByCategory,
  getUnlockedHavenMemories,
  giveDailyPetTreat,
  MONTHLY_TROPHY_THRESHOLDS,
  PET_BOND_XP_PER_LEVEL,
  PET_TREAT_DAILY_GEMS,
  summarizeMilestoneBadges,
} from './journal';

test('Monthly Daily Calendar computes days, leading offset, and cumulative non-punitive trophy tiers', () => {
  assert.equal(computeMonthlyTrophyTier(0), 'none');
  assert.equal(computeMonthlyTrophyTier(MONTHLY_TROPHY_THRESHOLDS.bronze), 'bronze');
  assert.equal(computeMonthlyTrophyTier(MONTHLY_TROPHY_THRESHOLDS.silver), 'silver');
  assert.equal(computeMonthlyTrophyTier(MONTHLY_TROPHY_THRESHOLDS.gold), 'gold');

  const completed = [
    '2026-11-01',
    '2026-11-03',
    '2026-11-08',
    '2026-11-12',
    '2026-11-18',
  ];
  const cal = buildDailyCalendarMonth(2026, 10, completed, '2026-11-18');
  assert.equal(cal.monthLabel, 'November 2026');
  assert.equal(cal.days.length, 30);
  assert.equal(cal.completedCountThisMonth, 5);
  assert.equal(cal.trophyTier, 'bronze');
  assert.equal(cal.nextTrophyTarget, MONTHLY_TROPHY_THRESHOLDS.silver);

  const todayCell = cal.days.find((d) => d.dateKey === '2026-11-18');
  assert.equal(todayCell?.isToday, true);
  assert.equal(todayCell?.completed, true);
});

test('Daily Pet Treat increases bond without streak penalty and awards Gems + level-up Rotate charge', () => {
  let bond = createDefaultPetBondState();
  assert.equal(canGiveDailyPetTreat(bond, '2026-11-18'), true);

  const first = giveDailyPetTreat(bond, '2026-11-18');
  assert.equal(first.given, true);
  assert.equal(first.gemsEarned, PET_TREAT_DAILY_GEMS);
  assert.equal(first.leveledUp, false);
  assert.equal(first.nextBond.xp, 1);

  // Same-day repeat is blocked cleanly
  const dup = giveDailyPetTreat(first.nextBond, '2026-11-18');
  assert.equal(dup.given, false);
  assert.equal(dup.gemsEarned, 0);

  // Missed days do NOT reset XP; third treat levels up pet bond
  bond = first.nextBond;
  const second = giveDailyPetTreat(bond, '2026-11-22');
  assert.equal(second.given, true);
  assert.equal(second.nextBond.xp, 2);

  const third = giveDailyPetTreat(second.nextBond, '2026-11-29');
  assert.equal(third.given, true);
  assert.equal(third.leveledUp, true);
  assert.equal(third.nextBond.level, 2);
  assert.equal(third.nextBond.xp, 0);
  assert.equal(third.bonusRotateCharges, 1);
  assert.equal(PET_BOND_XP_PER_LEVEL, 3);
});

test('Cozy Milestones evaluate progress accurately, grant Gems/Seed Packs once, and unlock Haven Memories across all 3 chapters', () => {
  let haven = createDefaultHavenProgress();
  let stars = 50;
  for (const slot of FURNITURE_SLOTS) {
    const res = applyFurnitureStyle(
      haven,
      stars,
      'rainy_conservatory',
      slot.id,
      'starlight_velvet'
    );
    haven = res.nextHaven;
    stars = res.nextStars;
  }

  const memories = getUnlockedHavenMemories(haven);
  assert.equal(memories.length, 8);
  assert.ok(memories.every((m) => m.chapter === 'rainy_conservatory' && m.note.length > 10));

  const ctx = {
    lifetimeStats: {
      ...createDefaultLifetimeStats(),
      totalLinesCleared: 32,
      highestComboEver: 4,
    },
    haven,
    herbarium: createDefaultHerbariumProgress(),
    completedDailyDates: ['2026-11-18'],
    petBond: { level: 2, xp: 0, lastTreatDate: '2026-11-18' },
  };

  const evaluated = evaluateMilestones(ctx, []);
  const roomMs = evaluated.find((m) => m.def.id === 'ms_room_restored_1');
  assert.equal(roomMs?.claimable, true);

  const claimRes = claimMilestoneReward('ms_room_restored_1', ctx, []);
  assert.equal(claimRes.claimed, true);
  assert.equal(claimRes.gemsEarned, 30);
  assert.equal(claimRes.seedPacksEarned, 1);
  assert.deepEqual(claimRes.nextClaimedMilestones, ['ms_room_restored_1']);

  // Duplicate claim prevented
  const dupClaim = claimMilestoneReward(
    'ms_room_restored_1',
    ctx,
    claimRes.nextClaimedMilestones
  );
  assert.equal(dupClaim.claimed, false);
  assert.equal(dupClaim.gemsEarned, 0);
});

test('Haven Milestones tracks 100 Lines Cleared, Perfect 5-Streak, category filters, and collectible badge summaries', () => {
  const ctx = {
    lifetimeStats: {
      ...createDefaultLifetimeStats(),
      totalLinesCleared: 108,
      highestComboEver: 3,
      totalStoryWins: 6,
      totalAcornGems: 22,
      bestFireflyStreak: 5,
    },
    haven: createDefaultHavenProgress(),
    herbarium: createDefaultHerbariumProgress(),
    completedDailyDates: [],
    petBond: createDefaultPetBondState(),
    // Even if active streak later drops to 0, peak bestFireflyStreak preserves Perfect 5-Streak!
    fireflyStreak: 0,
  };

  const evaluated = evaluateMilestones(ctx, ['ms_lines_25']);
  const lines100 = evaluated.find((m) => m.def.id === 'ms_lines_100');
  const streak5 = evaluated.find((m) => m.def.id === 'ms_perfect_5_streak');

  assert.equal(lines100?.def.title, '100 Lines Cleared');
  assert.equal(lines100?.def.badgeTier, 'gold');
  assert.equal(lines100?.completed, true);
  assert.equal(lines100?.claimable, true);
  assert.equal(lines100?.progressPct, 100);

  assert.equal(streak5?.def.title, 'Perfect 5-Streak');
  assert.equal(streak5?.def.badgeTier, 'heirloom');
  assert.equal(streak5?.current, 5);
  assert.equal(streak5?.completed, true);
  assert.equal(streak5?.claimable, true);

  const summary = summarizeMilestoneBadges(evaluated);
  assert.equal(summary.total, evaluated.length);
  assert.equal(summary.unlocked, 6); // all 6 gameplay feats unlocked
  assert.equal(summary.claimed, 1); // ms_lines_25 claimed
  assert.equal(summary.claimable, 5);

  const gameplayOnly = filterMilestonesByCategory(evaluated, 'gameplay');
  assert.equal(gameplayOnly.length, 6);
  assert.ok(gameplayOnly.every((m) => m.def.category === 'gameplay'));

  const claimStreak = claimMilestoneReward('ms_perfect_5_streak', ctx, ['ms_lines_25']);
  assert.equal(claimStreak.claimed, true);
  assert.equal(claimStreak.gemsEarned, 30);
  assert.equal(claimStreak.seedPacksEarned, 1);
});
