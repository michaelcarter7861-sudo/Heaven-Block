import { isAdMobAvailable } from './admob';
import { showRewardedAd, type RewardedAdResult } from './monetization';

export type PuzzleReward = 'UNDO' | 'ROTATE' | 'REVIVE_CLEAR_3X3' | 'DOUBLE_DAILY_SCORE' | 'POCKET_SKIP';

declare global {
  interface Window {
    /** Set by a portal adapter. Return true only after a completed rewarded ad. */
    showRewardedAd?: (reward: PuzzleReward) => Promise<boolean>;
  }
}

const webProvider = () => typeof window === 'undefined' ? undefined : window.showRewardedAd;
let pending = false;

export function canRequestPuzzleReward(noAdsOwned = false): boolean {
  return noAdsOwned || isAdMobAvailable() || Boolean(webProvider());
}

export async function requestPuzzleReward(
  rewardType: PuzzleReward,
  { noAdsOwned = false } = {},
): Promise<RewardedAdResult> {
  const unavailable = { rewarded: false, rewardType, skippedAsVip: false, message: 'Rewarded ad unavailable. Please try again later.' };
  if (pending || !canRequestPuzzleReward(noAdsOwned)) return unavailable;
  pending = true;
  try {
    if (noAdsOwned || isAdMobAvailable()) return await showRewardedAd(rewardType, { noAdsOwned });
    const provider = webProvider();
    return (await provider?.(rewardType)) === true
      ? { rewarded: true, rewardType, skippedAsVip: false }
      : unavailable;
  } catch {
    return unavailable;
  } finally {
    pending = false;
  }
}

/** Shared opt-in entry point. Callers keep rewards scoped to the requesting run. */
export async function requestRewardedAd(
  placement: PuzzleReward,
  onReward: () => void,
  options?: { noAdsOwned?: boolean },
): Promise<RewardedAdResult> {
  const result = await requestPuzzleReward(placement, options);
  if (result.rewarded) onReward();
  return result;
}
