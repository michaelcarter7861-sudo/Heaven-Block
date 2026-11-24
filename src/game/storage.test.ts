import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultPersistedState,
  exportSaveBackupString,
  importSaveBackupString,
  MAX_PERSISTED_UNDO_STEPS,
  normalizePersistedState,
} from './storage';
import { createEmptyGrid } from './solver';

test('exportSaveBackupString and importSaveBackupString round-trip player Cozy Room and settings state', () => {
  const base = createDefaultPersistedState();
  const customized = {
    ...base,
    bestScore: 4280,
    cozyStars: 14,
    unlockedLevel: 6,
    muted: true,
    settings: {
      soundEnabled: false,
      hapticsEnabled: false,
      screenShakeEnabled: false,
    },
    haven: {
      ...base.haven,
      activePet: 'shiba_pup' as const,
      rooms: {
        ...base.haven.rooms,
        cottage_living: {
          sofa: 'cottage_oak' as const,
          rug: 'starlight_velvet' as const,
        },
      },
    },
  };

  const backup = exportSaveBackupString(customized);
  assert.ok(backup.startsWith('HAVEN-SAVE-V2:'));

  const restored = importSaveBackupString(backup);
  assert.equal(restored.ok, true);
  if (restored.ok) {
    assert.equal(restored.state.bestScore, 4280);
    assert.equal(restored.state.cozyStars, 14);
    assert.equal(restored.state.unlockedLevel, 6);
    assert.equal(restored.state.settings.soundEnabled, false);
    assert.equal(restored.state.settings.hapticsEnabled, false);
    assert.equal(restored.state.settings.screenShakeEnabled, false);
    assert.equal(restored.state.haven.activePet, 'shiba_pup');
    assert.equal(restored.state.haven.rooms.cottage_living.sofa, 'cottage_oak');
  }
});

test('importSaveBackupString rejects empty, tampered, or malformed backup codes', () => {
  const empty = importSaveBackupString('   ');
  assert.equal(empty.ok, false);

  const wrongPrefix = importSaveBackupString('OTHER-SAVE:1234:abcd');
  assert.equal(wrongPrefix.ok, false);

  const valid = exportSaveBackupString(createDefaultPersistedState());
  const tampered = valid.slice(0, -4) + 'ZZZZ';
  const badChecksum = importSaveBackupString(tampered);
  assert.equal(badChecksum.ok, false);
});

test('normalizePersistedState migrates older saves without settings cleanly', () => {
  const legacy = {
    version: 2 as const,
    bestScore: 900,
    muted: true,
  };
  const normalized = normalizePersistedState(legacy);
  assert.equal(normalized.muted, true);
  assert.equal(normalized.settings.soundEnabled, false);
  assert.equal(normalized.settings.hapticsEnabled, true);
  assert.equal(normalized.settings.screenShakeEnabled, true);
});

test('normalizePersistedState caps activeRun.undoStack to last 5 moves', () => {
  const emptyGrid = createEmptyGrid();
  const base = createDefaultPersistedState();
  const snapshots = Array.from({ length: 8 }, (_, idx) => ({
    grid: emptyGrid,
    tray: [null, null, null],
    pocket: null,
    score: (idx + 1) * 100,
    combo: 0,
    linesCleared: 0,
    movesPlaced: idx,
    mossCleared: 0,
    acornGemsCollected: 0,
    bonusStarsEarned: 0,
    rotateCharges: 1,
    selectedSource: null,
  }));

  const normalized = normalizePersistedState({
    ...base,
    activeRun: {
      mode: 'story',
      levelNumber: 1,
      seedCode: 'LV1',
      rngState: 12345,
      grid: emptyGrid,
      tray: [null, null, null],
      pocket: null,
      score: 900,
      combo: 0,
      bestCombo: 0,
      linesCleared: 0,
      movesPlaced: 8,
      mossCleared: 0,
      acornGemsCollected: 0,
      bonusStarsEarned: 0,
      rotateCharges: 1,
        undoCharges: 2,
      undoStack: snapshots,
    },
  });

  assert.equal(MAX_PERSISTED_UNDO_STEPS, 5);
  assert.equal(normalized.activeRun?.undoStack.length, 5);
  assert.deepEqual(
    normalized.activeRun?.undoStack.map((s) => s.score),
    [400, 500, 600, 700, 800]
  );
});

