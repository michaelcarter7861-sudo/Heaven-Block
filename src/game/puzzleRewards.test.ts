import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestPuzzleReward, requestPuzzleReward, requestRewardedAd } from './puzzleRewards';

test('puzzle rewards are opt-in, fail closed and serialize provider requests', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const fakeWindow: Pick<Window, 'showRewardedAd'> = {};
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  try {
    assert.equal(canRequestPuzzleReward(), false);
    assert.equal((await requestPuzzleReward('UNDO')).rewarded, false);
    const calls: string[] = [];
    let complete!: (finished: boolean) => void;
    fakeWindow.showRewardedAd = (reward) => {
      calls.push(reward);
      return new Promise((resolve) => { complete = resolve; });
    };
    assert.equal(canRequestPuzzleReward(), true);
    assert.deepEqual(calls, []);
    const first = requestPuzzleReward('UNDO');
    assert.equal((await requestPuzzleReward('REVIVE_CLEAR_3X3')).rewarded, false);
    complete(true);
    assert.equal((await first).rewarded, true);
    assert.deepEqual(calls, ['UNDO']);
    let grants = 0;
    fakeWindow.showRewardedAd = async (placement) => placement === 'ROTATE';
    await requestRewardedAd('ROTATE', () => grants++);
    await requestRewardedAd('UNDO', () => grants++);
    assert.equal(grants, 1);
    fakeWindow.showRewardedAd = async () => false;
    assert.equal((await requestPuzzleReward('REVIVE_CLEAR_3X3')).rewarded, false);
    fakeWindow.showRewardedAd = async () => { throw new Error('unavailable'); };
    assert.equal((await requestPuzzleReward('UNDO')).rewarded, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
