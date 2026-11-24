import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGridFromLevel,
  createDuelDefinition,
  createLevel1OpeningTray,
  createLevel2OpeningTray,
  getBlockedCoordsForShape,
  getLevelDefinition,
  getLevelDifficultyMeta,
  getLevelTrayOptions,
  preSpawnWinStreakSpecials,
} from './levels';
import {
  createPieceInstance,
  hashSeedCode,
  mulberry32,
  POLYOMINO_CATALOG,
  rotateCellsCW,
  rotatePieceCW,
} from './shapes';
import {
  applyPlacement,
  canPlaceCells,
  canSolveTray,
  checkHasAnyPlayableMove,
  createEmptyGrid,
  generateSolvableTray,
  getBoardOccupancy,
  getWeightedCatalog,
  previewPlacement,
} from './solver';

function shapeById(id: string) {
  const found = POLYOMINO_CATALOG.find((s) => s.id === id);
  if (!found) throw new Error(`Missing shape ${id}`);
  return found;
}

test('rotateCellsCW returns exact original shape after 4 clockwise rotations', () => {
  const lShape = shapeById('l4_1');
  let cells = lShape.cells;
  for (let i = 0; i < 4; i++) {
    cells = rotateCellsCW(cells);
  }
  assert.deepEqual(cells, lShape.cells);
});

test('rotatePieceCW turns 1x3 horizontal into 3x1 vertical and increments rotations', () => {
  const triH = createPieceInstance(shapeById('tri_h'), 'honey_oak', 'test_tri');
  const rotated = rotatePieceCW(triH, 1);
  assert.equal(rotated.rotations, 1);
  assert.deepEqual(rotated.cells, [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 2, c: 0 },
  ]);
});

test('previewPlacement detects multi-line clear (row + column) and applyPlacement scores without awarding Spin charges', () => {
  const grid = createEmptyGrid();
  for (let c = 0; c < 8; c++) {
    if (c !== 5) grid[2][c] = { kind: 'tile', material: 'honey_oak', uid: `r_${c}` };
  }
  for (let r = 0; r < 8; r++) {
    if (r !== 2) grid[r][5] = { kind: 'tile', material: 'glazed_ceramic', uid: `c_${r}` };
  }

  const dot = createPieceInstance(shapeById('dot_1'), 'sea_glass', 'dot_test');
  const preview = previewPlacement(grid, dot.cells, 2, 5);

  assert.equal(preview.valid, true);
  assert.deepEqual(preview.clearedRows, [2]);
  assert.deepEqual(preview.clearedCols, [5]);
  assert.equal(preview.totalClearedLines, 2);

  const outcome = applyPlacement(grid, dot, 2, 5, 0);
  assert.equal(outcome.placeScore, 10);
  assert.equal(outcome.clearScore, 360);
  assert.equal(outcome.totalScoreGained, 370);
  assert.equal('earnedRotateCharges' in outcome, false);
  assert.equal(outcome.nextCombo, 1);
  assert.equal(outcome.nextGrid[2][5], null);
});

test('canSolveTray uses rotation charges and Pocket slot to rescue constrained boards', () => {
  const grid = createEmptyGrid();
  const isolatedHoles = new Set([
    '0,2', '0,4',
    '3,1', '3,3', '3,5',
    '4,2', '4,4', '4,7',
    '5,1', '5,3', '5,5',
    '6,2', '6,4', '6,7',
    '7,1', '7,3', '7,5',
  ]);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLeftSlot = c === 0 && r < 3;
      const isPreventClear = (c === 6 || c === 7) && r < 3;
      const isIsolated = isolatedHoles.has(`${r},${c}`);
      if (!isLeftSlot && !isPreventClear && !isIsolated) {
        grid[r][c] = { kind: 'tile', material: 'woven_rattan', uid: `f_${r}_${c}` };
      }
    }
  }

  const triH = createPieceInstance(shapeById('tri_h'), 'honey_oak', 't1');
  const dot = createPieceInstance(shapeById('dot_1'), 'sea_glass', 't2');
  const dot2 = createPieceInstance(shapeById('dot_1'), 'glazed_ceramic', 't3');

  assert.equal(canSolveTray(grid, [triH, dot, dot2], null, 0, false), false);
  assert.equal(canSolveTray(grid, [triH, dot, dot2], null, 0, true), true);
  assert.equal(canSolveTray(grid, [triH, dot, dot2], null, 1, false), true);
});

test('generateSolvableTray guarantees a solvable tray on heavily occupied boards', () => {
  const grid = createEmptyGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isHole =
        (r === 1 && c === 1) ||
        (r === 1 && c === 2) ||
        (r === 4 && c === 5) ||
        (r === 6 && c === 2) ||
        (r === 6 && c === 3) ||
        (r === 7 && c === 7);
      if (!isHole) {
        grid[r][c] = { kind: 'tile', material: 'honey_oak', uid: `occ_${r}_${c}` };
      }
    }
  }

  assert.ok(getBoardOccupancy(grid) > 0.85);
  const rng = mulberry32(hashSeedCode('HAVEN-84'));
  const tray = generateSolvableTray(grid, null, 1, rng);

  assert.equal(tray.length, 3);
  assert.equal(canSolveTray(grid, tray, null, 1, true), true);
  assert.equal(checkHasAnyPlayableMove(grid, tray, null, 1), true);
});

test('checkHasAnyPlayableMove returns false when board is completely blocked', () => {
  const grid = createEmptyGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      grid[r][c] = { kind: 'tile', material: 'glazed_ceramic', uid: `full_${r}_${c}` };
    }
  }
  grid[0][0] = null;

  const tray = [
    createPieceInstance(shapeById('sq_2x2'), 'honey_oak', 'p1'),
    createPieceInstance(shapeById('tri_h'), 'sea_glass', 'p2'),
  ];
  const pocket = createPieceInstance(shapeById('quad_h'), 'woven_rattan', 'pk');

  assert.equal(canPlaceCells(grid, tray[0].cells, 0, 0), false);
  assert.equal(checkHasAnyPlayableMove(grid, tray, pocket, 5), false);
});

test('Architectural layouts preserve blocked cells and clear active lines around obstacles', () => {
  const lvl3 = getLevelDefinition(3); // fountain_atrium (2x2 center blocked)
  const rng = mulberry32(hashSeedCode('FOUNTAIN'));
  const grid = buildGridFromLevel(lvl3, rng);

  const blocked = getBlockedCoordsForShape('fountain_atrium');
  assert.equal(blocked.length, 4);
  assert.equal(grid[3][3]?.kind, 'blocked');
  assert.equal(grid[4][4]?.kind, 'blocked');

  // Cannot place on blocked fountain cell
  const dot = createPieceInstance(shapeById('dot_1'), 'honey_oak', 'd_blk');
  assert.equal(canPlaceCells(grid, dot.cells, 3, 3), false);

  // Fill row 3 around the 2x2 fountain except (3,0), note (3,2) already has moss from lvl3
  for (let c = 1; c < 8; c++) {
    if (grid[3][c] === null) {
      grid[3][c] = { kind: 'tile', material: 'sea_glass', uid: `f3_${c}` };
    }
  }
  const outcome = applyPlacement(grid, dot, 3, 0, 0, rng);
  assert.deepEqual(outcome.clearedRows, [3]);
  // Fountain blocked cells remain intact, active tiles & moss cleared!
  assert.equal(outcome.nextGrid[3][3]?.kind, 'blocked');
  assert.equal(outcome.nextGrid[3][4]?.kind, 'blocked');
  assert.equal(outcome.nextGrid[3][0], null);
  assert.equal(outcome.mossCleared, 1);
});

test('Amber Honey Block clears 4 orthogonal neighbors including Moss without harming blocked tiles', () => {
  const grid = createEmptyGrid();
  grid[3][3] = { kind: 'blocked', material: 'honey_oak', uid: 'blk' };
  // Fill row 2 except (2,3)
  for (let c = 0; c < 8; c++) {
    if (c !== 3) {
      grid[2][c] = { kind: 'tile', material: 'honey_oak', uid: `r2_${c}` };
    }
  }
  // Place Moss above (2,3) at (1,3) and a tile below at (3,3) is blocked
  grid[1][3] = { kind: 'moss', material: 'glazed_ceramic', uid: 'moss_above' };

  const honeyDot = createPieceInstance(
    shapeById('dot_1'),
    'honey_oak',
    'honey_1',
    { specialCellIndex: 0, specialType: 'amber_honey' }
  );

  const outcome = applyPlacement(grid, honeyDot, 2, 3, 0);
  assert.equal(outcome.totalClearedLines, 1);
  assert.equal(outcome.nextGrid[1][3], null); // Moss splashed away!
  assert.equal(outcome.mossCleared, 1);
  assert.equal(outcome.nextGrid[3][3]?.kind, 'blocked'); // Blocked tile untouched!
});

test('Bloom-Seed sprouts a Flower tile that awards +1 bonus Cozy Star when cleared, and Lantern Glow doubles score', () => {
  const grid = createEmptyGrid();
  for (let c = 0; c < 8; c++) {
    if (c !== 0) grid[0][c] = { kind: 'tile', material: 'glazed_ceramic', uid: `r0_${c}` };
  }

  const rng = mulberry32(42);
  const bloomPiece = createPieceInstance(
    shapeById('dot_1'),
    'glazed_ceramic',
    'bloom_1',
    { specialCellIndex: 0, specialType: 'bloom_seed' }
  );

  const out1 = applyPlacement(grid, bloomPiece, 0, 0, 0, rng);
  assert.equal(out1.sproutedCells.length, 1);
  const flowerPos = out1.sproutedCells[0];
  assert.equal(out1.nextGrid[flowerPos.r][flowerPos.c]?.kind, 'flower');

  // Now complete the row containing the sprouted flower with a Lantern Glow block!
  const grid2 = out1.nextGrid;
  let missingCol = -1;
  for (let c = 0; c < 8; c++) {
    if (grid2[flowerPos.r][c] === null) {
      if (missingCol === -1) {
        missingCol = c;
      } else {
        grid2[flowerPos.r][c] = { kind: 'tile', material: 'sea_glass', uid: `fill_${c}` };
      }
    }
  }
  // Ensure missingCol exists (if flower landed on a row with 0 empty cells, unlikely since row 0 cleared)
  assert.ok(missingCol >= 0);

  const lanternDot = createPieceInstance(
    shapeById('dot_1'),
    'sea_glass',
    'lantern_1',
    { specialCellIndex: 0, specialType: 'lantern_glow' }
  );
  const out2 = applyPlacement(grid2, lanternDot, flowerPos.r, missingCol, 0, rng);
  assert.equal(out2.bonusFlowerStars, 1);
  assert.equal(out2.lanternDoubled, true);
  // Base 120 * 2 (lantern) + 50 (flower) + 10 (place) = 300
  assert.equal(out2.totalScoreGained, 300);
});

test('Same-Seed Friend Duel (HAVEN-84) produces identical board layouts and piece sequences', () => {
  const rngA = mulberry32(hashSeedCode('HAVEN-84'));
  const rngB = mulberry32(hashSeedCode('HAVEN-84'));

  const duelA = createDuelDefinition(rngA);
  const duelB = createDuelDefinition(rngB);
  assert.equal(duelA.boardShape, duelB.boardShape);

  const gridA = buildGridFromLevel(duelA, rngA);
  const gridB = buildGridFromLevel(duelB, rngB);

  const trayA1 = generateSolvableTray(gridA, null, 1, rngA, {
    allowedSpecials: duelA.allowedSpecials,
  });
  const trayB1 = generateSolvableTray(gridB, null, 1, rngB, {
    allowedSpecials: duelB.allowedSpecials,
  });

  assert.deepEqual(
    trayA1.map((p) => ({
      shapeId: p.shapeId,
      material: p.material,
      specialType: p.specialType,
      specialCellIndex: p.specialCellIndex,
    })),
    trayB1.map((p) => ({
      shapeId: p.shapeId,
      material: p.material,
      specialType: p.specialType,
      specialCellIndex: p.specialCellIndex,
    }))
  );
});

test('Level 1 4-second first-move hook triggers instant 2-line combo clear', () => {
  const lvl1 = getLevelDefinition(1);
  const rng = mulberry32(hashSeedCode('LV1-HOOK'));
  const grid = buildGridFromLevel(lvl1, rng);
  const openingTray = createLevel1OpeningTray();

  const bar = openingTray[0];
  const preview = previewPlacement(grid, bar.cells, 3, 3);
  assert.equal(preview.valid, true);
  assert.deepEqual(preview.clearedRows, [3]);
  assert.deepEqual(preview.clearedCols, [4]);
  assert.equal(preview.totalClearedLines, 2);

  const outcome = applyPlacement(grid, bar, 3, 3, 0, rng);
  assert.equal(outcome.totalClearedLines, 2);
  assert.ok(outcome.totalScoreGained >= 300);
});

test('Amber Honey Cascade Chain completes and clears an additional near-full line with cascade bonus', () => {
  const grid = createEmptyGrid();
  // Row 2 missing only (2,3) -> placing Amber Honey dot at (2,3) clears Row 2 and splashes orthogonal empty cells (1,3), (3,3), (2,2), (2,4)
  for (let c = 0; c < 8; c++) {
    if (c !== 3) {
      grid[2][c] = { kind: 'tile', material: 'honey_oak', uid: `r2_${c}` };
    }
  }
  // Row 1 has 7/8 tiles (missing only (1,3)) -> Honey splash at (1,3) bridges Row 1 and triggers CASCADE x2!
  for (let c = 0; c < 8; c++) {
    if (c !== 3) {
      grid[1][c] = { kind: 'tile', material: 'glazed_ceramic', uid: `r1_${c}` };
    }
  }

  const honeyDot = createPieceInstance(shapeById('dot_1'), 'honey_oak', 'honey_cascade', {
    specialCellIndex: 0,
    specialType: 'amber_honey',
  });

  const outcome = applyPlacement(grid, honeyDot, 2, 3, 0);
  assert.equal(outcome.cascadeCount >= 1, true);
  assert.equal(outcome.cascadeLinesCleared >= 1, true);
  assert.ok(outcome.cascadeBonusScore > 0);
  assert.equal(outcome.totalClearedLines >= 2, true);
  // Row 1 tiles must be cleared!
  assert.equal(outcome.nextGrid[1][0], null);
  assert.equal(outcome.nextGrid[1][7], null);
});

test('Silent DDA boosts 1x1, 2x2, and straight-line piece weights by 25% when ddaBoost is active', () => {
  const normalWeights = getWeightedCatalog(0.4, false);
  const ddaWeights = getWeightedCatalog(0.4, true);

  const dotNormal = normalWeights.find((e) => e.shape.id === 'dot_1')!.weight;
  const dotDda = ddaWeights.find((e) => e.shape.id === 'dot_1')!.weight;
  assert.ok(Math.abs(dotDda - dotNormal * 1.25) < 1e-6);

  const sqNormal = normalWeights.find((e) => e.shape.id === 'sq_2x2')!.weight;
  const sqDda = ddaWeights.find((e) => e.shape.id === 'sq_2x2')!.weight;
  assert.ok(Math.abs(sqDda - sqNormal * 1.25) < 1e-6);

  const lNormal = normalWeights.find((e) => e.shape.id === 'l4_1')!.weight;
  const lDda = ddaWeights.find((e) => e.shape.id === 'l4_1')!.weight;
  assert.equal(lDda, lNormal);
});

test('Sawtooth difficulty marks every 5th level as Master Artisan Trial (2x stars) followed by Bonus Bloom', () => {
  const lv5 = getLevelDefinition(5);
  const lv5Meta = getLevelDifficultyMeta(lv5);
  assert.equal(lv5Meta.tier, 'master_trial');
  assert.equal(lv5Meta.starMultiplier, 2);

  const lv6 = getLevelDefinition(6);
  const lv6Meta = getLevelDifficultyMeta(lv6);
  assert.equal(lv6Meta.tier, 'bonus_bloom');
  assert.equal(lv6Meta.starMultiplier, 1);

  const lv10 = getLevelDefinition(10);
  assert.equal(getLevelDifficultyMeta(lv10).tier, 'master_trial');
  assert.equal(getLevelDifficultyMeta(lv10).starMultiplier, 2);

  const lv11 = getLevelDefinition(11);
  assert.equal(getLevelDifficultyMeta(lv11).tier, 'bonus_bloom');
});

test('Firefly Lantern Win-Streak pre-spawns 1 special tile at streak 1-2 and 2 at streak 3-5', () => {
  const rng1 = mulberry32(101);
  const g1 = createEmptyGrid();
  const s1 = preSpawnWinStreakSpecials(g1, 2, rng1);
  assert.equal(s1, 1);

  const rng2 = mulberry32(202);
  const g2 = createEmptyGrid();
  const s2 = preSpawnWinStreakSpecials(g2, 4, rng2);
  assert.equal(s2, 2);
});

test('generateSolvableTray handles 95%+ occupancy (< 3 empty cells) without blindly returning 3 pebbles', () => {
  // 0 empty cells (full tiles) -> returns []
  const fullGrid = createEmptyGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      fullGrid[r][c] = { kind: 'tile', material: 'honey_oak', uid: `f_${r}_${c}` };
    }
  }
  assert.deepEqual(generateSolvableTray(fullGrid, null, 0, mulberry32(1)), []);

  // 2 empty cells on a 96.8% occupied grid -> returned tray is guaranteed solvable
  const tightBlocked = createEmptyGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!((r === 0 && c === 0) || (r === 7 && c === 7))) {
        tightBlocked[r][c] = { kind: 'blocked', material: 'honey_oak', uid: `b_${r}_${c}` };
      }
    }
  }
  const trayOne = generateSolvableTray(tightBlocked, null, 0, mulberry32(7));
  assert.ok(trayOne.length >= 1 && trayOne.length <= 3);
  assert.equal(canSolveTray(tightBlocked, trayOne, null, 0, true), true);

  // 0 empty cells (all blocked) -> returns []
  const allBlocked = createEmptyGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      allBlocked[r][c] = { kind: 'blocked', material: 'honey_oak', uid: `ab_${r}_${c}` };
    }
  }
  assert.deepEqual(generateSolvableTray(allBlocked, null, 0, mulberry32(9)), []);
});

test('Level 2 Acorn Gems goal spawns deterministic acorn-bearing pieces in opening tray and subsequent waves', () => {
  const lvl2 = getLevelDefinition(2);
  assert.equal(lvl2.goal.type, 'acorn_gems');
  assert.equal(lvl2.goal.target, 8);
  assert.equal(lvl2.initialAcornCoords.length, 4);

  const opening = createLevel2OpeningTray();
  assert.equal(opening.length, 3);
  const openingAcorns = opening.reduce(
    (sum, p) => sum + (p.acornCellIndices?.length ?? 0),
    0
  );
  assert.equal(openingAcorns, 3);

  const rng = mulberry32(hashSeedCode('LEVEL-2'));
  const grid = buildGridFromLevel(lvl2, rng);
  const opts = getLevelTrayOptions(lvl2, false);
  assert.equal(opts.spawnAcornGems, true);
  assert.equal(opts.minAcornPieces, 2);

  let waveAcorns = 0;
  for (let wave = 0; wave < 3; wave++) {
    const tray = generateSolvableTray(grid, null, 1, rng, opts);
    const piecesWithAcorn = tray.filter(
      (p) => (p.acornCellIndices?.length ?? 0) > 0
    ).length;
    assert.ok(piecesWithAcorn >= 2);
    waveAcorns += piecesWithAcorn;
  }

  // 4 initial + 3 opening + >=6 over next 3 waves = 13+ >= 8 required
  assert.ok(lvl2.initialAcornCoords.length + openingAcorns + waveAcorns >= 8);
});


