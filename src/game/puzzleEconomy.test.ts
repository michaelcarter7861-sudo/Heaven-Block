import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPower, conservatoryTheme, dailyStreak, getDailyMilestoneProgress, MAX_SPINS, MAX_UNDOS, POCKET_COOLDOWN, DAILY_TARGET } from './puzzleEconomy';
import { CAT_NAP_BONUS, CAT_NAP_INTERVAL, settleCatNap, validNapCorner } from './catNap';
import { checkHasAnyPlayableMove, createEmptyGrid } from './solver';
import type { Grid8x8, PieceInstance } from './types';

test('resumed power-ups and cooldown are clamped without refilling zero charges', () => {
  assert.equal(clampPower(20, MAX_SPINS), 2);
  assert.equal(clampPower(20, MAX_UNDOS), 1);
  assert.equal(clampPower(0, MAX_SPINS), 0);
  assert.equal(clampPower(-1, MAX_UNDOS), 0);
  assert.equal(clampPower(undefined, MAX_SPINS), 1);
  assert.equal(clampPower(undefined, POCKET_COOLDOWN, 0), 0);
});

test('daily streak respects gaps and survives a pending local day', () => {
  const dates = ['2026-11-17', '2026-11-19', '2026-11-20', '2026-11-20'];
  assert.equal(dailyStreak(dates, new Date(2026, 10, 21)), 2);
  assert.equal(dailyStreak(dates, new Date(2026, 10, 22)), 0);
});

test('atmosphere switches at fixed thresholds and the Night Candle override', () => {
  assert.equal(conservatoryTheme(1999, false), 'morning');
  assert.equal(conservatoryTheme(2000, false), 'rain');
  assert.equal(conservatoryTheme(4999, false), 'rain');
  assert.equal(conservatoryTheme(5000, false), 'candlelight');
  assert.equal(conservatoryTheme(0, true), 'candlelight');
});

test('Cat Nap picks an empty corner deterministically and pays once for an adjacent line', () => {
  const grid = createEmptyGrid();
  grid[0][0] = { kind: 'tile', material: 'honey_oak', uid: 'tile' };
  assert.equal(settleCatNap(grid, null, CAT_NAP_INTERVAL - 1, [], []).nap, null);
  const { nap } = settleCatNap(grid, null, CAT_NAP_INTERVAL, [], []);
  assert.deepEqual(nap, { r: 0, c: 6 });
  assert.equal(validNapCorner({ r: 0, c: 7 }), null);
  assert.equal(settleCatNap(grid, nap, 19, [3], []).bonus, 0);
  const awake = settleCatNap(grid, nap, 20, [2], []);
  assert.deepEqual(awake, { nap: null, bonus: CAT_NAP_BONUS });
  assert.equal(settleCatNap(grid, awake.nap, 21, [2], []).bonus, 0);
});

test('a resting Pocket cannot falsely keep a dead board playable', () => {
  const grid: Grid8x8 = createEmptyGrid().map(row => row.map(() => ({ kind: 'blocked', material: 'honey_oak', uid: 'wall' })));
  grid[1][1] = null;
  const piece: PieceInstance = { uid: 'p', shapeId: 'domino_h', name: 'Domino', material: 'honey_oak', cells: [{r:0,c:0},{r:0,c:1}], rotations: 0 };
  assert.equal(checkHasAnyPlayableMove(grid, [piece], null, 0), true);
  assert.equal(checkHasAnyPlayableMove(grid, [piece], null, 0, false), false);
  assert.equal(checkHasAnyPlayableMove(grid, [piece], {...piece, cells: [{r:0,c:0}]}, 0, false), true);
});


test('Daily milestones advance through every reward tier', () => {
  assert.deepEqual(getDailyMilestoneProgress(0), { completed: 0, base: 0, target: 1500, next: 1500, progress: 0, finished: false });
  assert.equal(getDailyMilestoneProgress(1499).next, 1500);
  assert.equal(getDailyMilestoneProgress(1500).completed, 1);
  assert.equal(getDailyMilestoneProgress(1500).target, 3000);
  assert.equal(getDailyMilestoneProgress(1500).progress, 0);
  assert.equal(getDailyMilestoneProgress(2250).progress, 0.5);
  assert.equal(getDailyMilestoneProgress(3000).target, 5000);
  assert.equal(getDailyMilestoneProgress(5000).target, 10000);
  assert.equal(getDailyMilestoneProgress(10000).finished, true);
  assert.equal(getDailyMilestoneProgress(12000).progress, 1);
  assert.equal(DAILY_TARGET, 1500);
});
