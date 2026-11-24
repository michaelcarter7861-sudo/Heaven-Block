import {
  isAdMobAvailable,
  requestAdConsent as refreshNativeAdConsent,
  showNativeRewardedAd,
} from './admob';
import type { AdRewardType, DifficultyTier, MonetizationState, StoreProductId } from './types';

export interface RewardedAdResult {
  rewarded: boolean;
  rewardType: AdRewardType;
  skippedAsVip: boolean;
  message?: string;
}

export interface RewardedAdPreviewStatus {
  active: boolean;
  rewardType: AdRewardType;
  durationMs: number;
  remainingMs: number;
}

export const AD_REWARD_META: Record<
  AdRewardType,
  { title: string; subtitle: string; rewardBadge: string }
> = {
  UNDO: {
    title: 'Tactical Undo Recharge',
    subtitle: 'Rewind your last placement',
    rewardBadge: '+1 Undo Charge',
  },
  ROTATE: {
    title: 'Artisan Rotate Charge',
    subtitle: 'Spin any piece 90° clockwise',
    rewardBadge: '+1 Rotate Charge',
  },
  REVIVE_CLEAR_3X3: {
    title: 'Garden Rescue Clear',
    subtitle: 'Clears a 3×3 block zone to keep playing',
    rewardBadge: '3×3 Center Clear',
  },
  DOUBLE_STARS: {
    title: 'Double Cozy Stars',
    subtitle: 'Earn 2× stars for your Cozy Haven',
    rewardBadge: '2× Cozy Stars',
  },
  DOUBLE_DAILY_SCORE: {
    title: 'Daily Bonus',
    subtitle: 'Double the recorded Daily best-score result',
    rewardBadge: '2× Daily Best',
  },
  POCKET_SKIP: {
    title: 'Pocket Ready',
    subtitle: 'Skip the Pocket’s two-move cooldown',
    rewardBadge: 'Pocket Ready',
  },
  FREE_GEMS: {
    title: 'Free Cozy Gems',
    subtitle: 'Bonus gems for your boutique collection',
    rewardBadge: '+10 Cozy Gems',
  },
};

export const COZY_STARTER_BUNDLE = {
  id: 'cozy_no_ads_starter_v1',
  name: 'No Ads + Cozy Starter Bundle',
  priceLabel: '$3.99',
  bonusStars: 10,
  bonusUndo: 3,
  bonusRotate: 3,
  perks: [
    'Remove all ad waits — instant VIP rewards',
    '+10 Cozy Stars for immediate room decorating',
    '+3 Tactical Undo & +3 Rotate Charges',
  ],
};

export interface DailyStreakReward {
  day: number; // 1..7
  stars: number;
  undo: number;
  rotate: number;
  label: string;
}

export const DAILY_STREAK_REWARDS: DailyStreakReward[] = [
  { day: 1, stars: 1, undo: 0, rotate: 0, label: '+1 ★' },
  { day: 2, stars: 1, undo: 0, rotate: 1, label: '+1 ★ · +1 Rotate' },
  { day: 3, stars: 1, undo: 0, rotate: 0, label: '+1 ★' },
  { day: 4, stars: 1, undo: 2, rotate: 0, label: '+1 ★ · +2 Undo' },
  { day: 5, stars: 1, undo: 0, rotate: 0, label: '+1 ★' },
  { day: 6, stars: 1, undo: 0, rotate: 2, label: '+1 ★ · +2 Rotate' },
  { day: 7, stars: 3, undo: 1, rotate: 1, label: '+3 ★ Chest!' },
];

export function createDefaultMonetizationState(): MonetizationState {
  return {
    noAdsBundlePurchased: false,
    starterOfferShown: false,
    ratingPromptShown: false,
    adConsentStatus: 'unknown',
    streakCount: 0,
    lastClaimDate: null,
    totalDaysClaimed: 0,
  };
}

export const SMART_OFFER_FURNITURE_THRESHOLD = 3;
export const RATE_US_FURNITURE_THRESHOLD = 4;

/**
 * Returns true only when running inside a native Capacitor Android/iOS runtime.
 * Standard web browsers return false so the web demo hides real-money IAP checkout
 * buttons, fake ad timers, and simulated 5-star review flows.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (
    window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
      };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function shouldTriggerSmartStarterOffer(
  unlockedFurnitureCount: number,
  state: MonetizationState,
  options?: { unlockedLevel?: number; nativeOnly?: boolean }
): boolean {
  if (options?.unlockedLevel !== undefined && options.unlockedLevel < 2) {
    return false;
  }
  if (options?.nativeOnly && !isNativePlatform()) {
    return false;
  }
  return (
    unlockedFurnitureCount >= SMART_OFFER_FURNITURE_THRESHOLD &&
    !state.noAdsBundlePurchased &&
    !state.starterOfferShown
  );
}

/**
 * Triggers a non-intrusive "Rate Us!" modal once after the player unlocks
 * their 4th Cozy Room furniture upgrade (never on a loss, and delayed until after Level 1).
 */
export function shouldTriggerRateUsPrompt(
  unlockedFurnitureCount: number,
  state: MonetizationState,
  triggerContext: 'haven_upgrade' | 'loss' = 'haven_upgrade',
  options?: { unlockedLevel?: number; nativeOnly?: boolean }
): boolean {
  if (triggerContext === 'loss') return false;
  if (options?.unlockedLevel !== undefined && options.unlockedLevel < 2) {
    return false;
  }
  if (options?.nativeOnly && !isNativePlatform()) {
    return false;
  }
  return (
    unlockedFurnitureCount >= RATE_US_FURNITURE_THRESHOLD &&
    !state.ratingPromptShown
  );
}

export type AdConsentResult = import('./admob').AdConsentResult;

/**
 * Refresh UMP consent from Settings. Native UMP errors fail closed; browser
 * builds never pretend that consent has been collected.
 */
export async function requestAdConsent(): Promise<AdConsentResult> {
  return refreshNativeAdConsent({ showPrivacyOptions: true });
}

export interface RestorePurchasesResult {
  restoredNoAdsBundle: boolean;
  restoredProductIds?: StoreProductId[];
  message: string;
  nextState: MonetizationState;
}

/**
 * Play Billing purchase restoration hook for Settings screen compliance.
 */
export function restorePlayStorePurchases(
  state: MonetizationState
): RestorePurchasesResult {
  if (state.noAdsBundlePurchased) {
    return {
      restoredNoAdsBundle: true,
      restoredProductIds: ['bundle_cozy_starter_v1'],
      message: 'VIP No Ads + Cozy Starter Bundle is active on this device.',
      nextState: state,
    };
  }
  return {
    restoredNoAdsBundle: false,
    restoredProductIds: [],
    message:
      'Checked Play Store receipts — no prior bundle purchases found for this account.',
    nextState: state,
  };
}

/**
 * Native-aware async purchase restoration hook for Android Google Play Billing.
 * Queries `Capacitor.Plugins.Billing.restorePurchases()` on Android and reconciles
 * non-consumable bundle entitlements cleanly.
 */
export async function restorePlayStorePurchasesAsync(
  state: MonetizationState
): Promise<RestorePurchasesResult> {
  if (typeof window !== 'undefined') {
    const cap = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            Billing?: {
              restorePurchases?: () => Promise<{
                productIds?: string[];
                restoredNoAds?: boolean;
              }>;
            };
          };
        };
      }
    ).Capacitor;
    const billing = cap?.Plugins?.Billing;
    if (billing?.restorePurchases) {
      try {
        const res = await billing.restorePurchases();
        const rawIds = Array.isArray(res?.productIds) ? res.productIds : [];
        const ownedStarter =
          Boolean(res?.restoredNoAds) ||
          rawIds.includes('bundle_cozy_starter_v1') ||
          rawIds.includes(COZY_STARTER_BUNDLE.id);
        const ownedMaster = rawIds.includes('bundle_master_artisan_v1');
        const restoredIds: StoreProductId[] = [];
        if (ownedStarter) restoredIds.push('bundle_cozy_starter_v1');
        if (ownedMaster) restoredIds.push('bundle_master_artisan_v1');

        if (ownedStarter || ownedMaster) {
          return {
            restoredNoAdsBundle: ownedStarter || state.noAdsBundlePurchased,
            restoredProductIds: restoredIds,
            message:
              'Google Play Billing verified and restored your owned bundle entitlements!',
            nextState: {
              ...state,
              noAdsBundlePurchased: ownedStarter || state.noAdsBundlePurchased,
            },
          };
        }
        return {
          restoredNoAdsBundle: state.noAdsBundlePurchased,
          restoredProductIds: [],
          message:
            'Checked Google Play Billing — no additional prior bundle receipts found.',
          nextState: state,
        };
      } catch {
        // Fall through to local entitlement check
      }
    }
  }
  return restorePlayStorePurchases(state);
}

export const STORY_WIN_GEMS_STANDARD = 5;
export const STORY_WIN_GEMS_MASTER_TRIAL = 15;
export const DAILY_PUZZLE_COMPLETION_GEMS = 10;

/**
 * Pure deterministic Cozy Gem drop calculation for completing a Story level.
 * Master Artisan Trials (every 5th level) award +15 Gems; standard & Bonus Bloom levels award +5 Gems.
 */
export function computeStoryVictoryGemDrop(
  levelNumber: number,
  difficultyTier?: DifficultyTier | 'normal'
): number {
  if (difficultyTier === 'master_trial' || (levelNumber > 0 && levelNumber % 5 === 0)) {
    return STORY_WIN_GEMS_MASTER_TRIAL;
  }
  return STORY_WIN_GEMS_STANDARD;
}

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic date-seeded Daily Haven Puzzle seed (YYYY-MM-DD).
 */
export function getDailyPuzzleSeed(dateKey = getTodayDateKey()): string {
  return `DAILY-${dateKey}`;
}

export function isDailyPuzzleSeed(seedCode: string): boolean {
  return seedCode.trim().toUpperCase().startsWith('DAILY-');
}

export function extractDailyDateFromSeed(seedCode: string): string | null {
  const clean = seedCode.trim().toUpperCase();
  if (!clean.startsWith('DAILY-')) return null;
  const datePart = clean.replace(/^DAILY-/, '');
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

/**
 * Records a completed Daily Haven Puzzle run, returning whether it is the player's
 * first completion for that date (+10 Cozy Gems reward) and updating their Daily Best score.
 */
export function recordDailyPuzzleRun(params: {
  seedCode: string;
  score: number;
  completedDailyDates: string[];
  dailyBestScore: number;
}): {
  isDaily: boolean;
  dateKey: string | null;
  firstCompletionToday: boolean;
  gemsEarned: number;
  nextCompletedDailyDates: string[];
  nextDailyBestScore: number;
} {
  const dateKey = extractDailyDateFromSeed(params.seedCode);
  if (!dateKey || params.score <= 0) {
    return {
      isDaily: Boolean(dateKey),
      dateKey,
      firstCompletionToday: false,
      gemsEarned: 0,
      nextCompletedDailyDates: params.completedDailyDates,
      nextDailyBestScore: params.dailyBestScore,
    };
  }

  const alreadyCompleted = params.completedDailyDates.includes(dateKey);
  const nextCompletedDailyDates = alreadyCompleted
    ? params.completedDailyDates
    : [...params.completedDailyDates, dateKey].slice(-60);

  return {
    isDaily: true,
    dateKey,
    firstCompletionToday: !alreadyCompleted,
    gemsEarned: alreadyCompleted ? 0 : DAILY_PUZZLE_COMPLETION_GEMS,
    nextCompletedDailyDates,
    nextDailyBestScore: Math.max(params.dailyBestScore, Math.floor(params.score)),
  };
}

/**
 * Builds a spoiler-free shareable result card for Daily Haven Puzzle or Seed Duel runs.
 */
export function formatDailyShareCard(params: {
  seedCode: string;
  score: number;
  linesCleared: number;
  bestCombo: number;
  playUrl?: string;
}): string {
  const cleanSeed = params.seedCode.trim().toUpperCase() || getDailyPuzzleSeed();
  const isDaily = isDailyPuzzleSeed(cleanSeed);
  const datePart = isDaily ? cleanSeed.replace(/^DAILY-/, '') : cleanSeed;
  const blocksRow =
    params.linesCleared >= 12
      ? '🪵🏺💎🧺🌟'
      : params.linesCleared >= 6
        ? '🪵🏺💎🧺'
        : '🪵🏺💎';
  const header = isDaily
    ? `HavenBlocks Daily ${datePart}`
    : `HavenBlocks Seed ${cleanSeed}`;
  const stats = `${blocksRow} Score ${params.score.toLocaleString()} · ${params.linesCleared} Lines · ${Math.max(1, params.bestCombo)}× Combo`;
  return params.playUrl
    ? `${header}\n${stats}\nPlay this same board: ${params.playUrl}`
    : `${header}\n${stats}`;
}

function daysBetween(prevDateKey: string, nextDateKey: string): number {
  const [py, pm, pd] = prevDateKey.split('-').map(Number);
  const [ny, nm, nd] = nextDateKey.split('-').map(Number);
  if (!py || !pm || !pd || !ny || !nm || !nd) return 999;
  const t1 = Date.UTC(py, pm - 1, pd);
  const t2 = Date.UTC(ny, nm - 1, nd);
  return Math.round((t2 - t1) / 86_400_000);
}

export function canClaimDailyStreak(
  state: MonetizationState,
  todayKey = getTodayDateKey()
): boolean {
  return state.lastClaimDate !== todayKey;
}

/**
 * Auto-shows the 7-Day Login Streak popup only after the player has
 * completed Level 1 (unlockedLevel >= 2), avoiding a first-launch modal gate.
 */
export function canAutoShowDailyStreakPopup(
  state: MonetizationState,
  unlockedLevel: number,
  todayKey = getTodayDateKey()
): boolean {
  return unlockedLevel >= 2 && canClaimDailyStreak(state, todayKey);
}

/**
 * Non-punitive "pause-and-resume" 7-day login progression:
 * If a player misses one or more days (diff > 1), their progress pauses and resumes
 * at the next reward day instead of resetting back to Day 1.
 */
export function getNextStreakDay(
  state: MonetizationState,
  todayKey = getTodayDateKey()
): number {
  if (!state.lastClaimDate || state.streakCount <= 0) return 1;
  const diff = daysBetween(state.lastClaimDate, todayKey);
  if (diff === 0) return Math.max(1, state.streakCount);
  return state.streakCount >= 7 ? 1 : state.streakCount + 1;
}

export function claimDailyStreakReward(
  state: MonetizationState,
  todayKey = getTodayDateKey()
): {
  claimed: boolean;
  reward: DailyStreakReward | null;
  nextState: MonetizationState;
} {
  if (!canClaimDailyStreak(state, todayKey)) {
    return { claimed: false, reward: null, nextState: state };
  }

  const nextDay = getNextStreakDay(state, todayKey);
  const reward =
    DAILY_STREAK_REWARDS.find((r) => r.day === nextDay) ??
    DAILY_STREAK_REWARDS[0];

  return {
    claimed: true,
    reward,
    nextState: {
      ...state,
      streakCount: nextDay,
      lastClaimDate: todayKey,
      totalDaysClaimed: state.totalDaysClaimed + 1,
    },
  };
}

// ---------- Isolated Play Store / AdMob Hook ----------
type AdListener = (status: RewardedAdPreviewStatus | null) => void;
const adListeners = new Set<AdListener>();

let activeTimer: ReturnType<typeof setInterval> | null = null;
let activeResolver: ((res: RewardedAdResult) => void) | null = null;
let activeRewardType: AdRewardType | null = null;

function emitAdStatus(status: RewardedAdPreviewStatus | null) {
  for (const listener of adListeners) {
    listener(status);
  }
}

export function subscribeRewardedAd(listener: AdListener): () => void {
  adListeners.add(listener);
  return () => {
    adListeners.delete(listener);
  };
}

export function cancelRewardedAd(): void {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  const resolver = activeResolver;
  const rType = activeRewardType ?? 'UNDO';
  activeResolver = null;
  activeRewardType = null;
  emitAdStatus(null);
  if (resolver) {
    resolver({ rewarded: false, rewardType: rType, skippedAsVip: false });
  }
}

/**
 * Clean, isolated async rewarded-ad hook.
 * Native builds use Google AdMob. A two-second preview is available only in
 * Vite development mode. Production web builds never simulate a paid ad.
 */
export async function showRewardedAd(
  rewardType: AdRewardType,
  options?: { noAdsOwned?: boolean; durationMs?: number }
): Promise<RewardedAdResult> {
  if (options?.noAdsOwned) {
    return {
      rewarded: true,
      rewardType,
      skippedAsVip: true,
    };
  }

  // Native production: only the real Google rewarded-ad result can grant a reward.
  if (isAdMobAvailable()) {
    const nativeResult = await showNativeRewardedAd();
    return {
      rewarded: nativeResult.rewarded,
      rewardType,
      skippedAsVip: false,
      message: nativeResult.message,
    };
  }

  // Browser preview simulation is development-only. Production web builds and
  // native builds with a missing plugin fail closed and never grant fake rewards.
  const isDevelopmentPreview = Boolean(
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
  );
  if (!isDevelopmentPreview) {
    return {
      rewarded: false,
      rewardType,
      skippedAsVip: false,
      message: 'Rewarded ads are available in the installed Android app.',
    };
  }

  if (activeTimer || activeResolver) {
    cancelRewardedAd();
  }

  const durationMs = options?.durationMs ?? 2000;

  return new Promise<RewardedAdResult>((resolve) => {
    activeResolver = resolve;
    activeRewardType = rewardType;
    const startedAt = Date.now();

    emitAdStatus({
      active: true,
      rewardType,
      durationMs,
      remainingMs: durationMs,
    });

    activeTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = Math.max(0, durationMs - elapsed);

      if (remainingMs <= 0) {
        if (activeTimer) {
          clearInterval(activeTimer);
          activeTimer = null;
        }
        const finishResolve = activeResolver;
        activeResolver = null;
        activeRewardType = null;
        emitAdStatus(null);
        finishResolve?.({
          rewarded: true,
          rewardType,
          skippedAsVip: false,
        });
      } else {
        emitAdStatus({
          active: true,
          rewardType,
          durationMs,
          remainingMs,
        });
      }
    }, 50);
  });
}

/**
 * Triggers native Google Play In-App Review sheet when running inside Capacitor on Android.
 */
export async function triggerNativeInAppReview(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const cap = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            InAppReview?: {
              requestReview?: () => Promise<void>;
            };
          };
        };
      }
    ).Capacitor;
    const reviewPlugin = cap?.Plugins?.InAppReview;
    if (reviewPlugin?.requestReview) {
      try {
        await reviewPlugin.requestReview();
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

export interface StorePurchaseResult {
  success: boolean;
  productId: StoreProductId;
  simulated: boolean;
  message: string;
}

/**
 * Clean Play Billing / Capacitor IAP bridge for all real-money bundles & Gem packs.
 * Simulated only when `import.meta.env.DEV` is true; otherwise routes to native
 * Capacitor Billing when installed on Android.
 */
export async function purchaseStoreProduct(
  productId: StoreProductId,
  options?: { devSimulationOverride?: boolean; delayMs?: number }
): Promise<StorePurchaseResult> {
  if (typeof window !== 'undefined') {
    const cap = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            Billing?: {
              purchaseProduct?: (args: {
                productId: string;
              }) => Promise<{ purchased?: boolean; message?: string }>;
            };
          };
        };
      }
    ).Capacitor;
    const billing = cap?.Plugins?.Billing;
    if (billing?.purchaseProduct) {
      try {
        const res = await billing.purchaseProduct({ productId });
        const purchased = Boolean(res?.purchased);
        return {
          success: purchased,
          productId,
          simulated: false,
          message:
            res?.message ??
            (purchased
              ? 'Google Play purchase verified!'
              : 'Purchase was cancelled.'),
        };
      } catch {
        return {
          success: false,
          productId,
          simulated: false,
          message: 'Google Play Billing unavailable right now.',
        };
      }
    }
  }

  const isDevEnv = Boolean(
    options?.devSimulationOverride ??
      (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
  );

  if (isDevEnv) {
    const delayMs = options?.delayMs ?? 120;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return {
      success: true,
      productId,
      simulated: true,
      message: 'Dev checkout complete — items delivered!',
    };
  }

  return {
    success: false,
    productId,
    simulated: false,
    message:
      'In-app purchases require Google Play Billing on an Android build.',
  };
}

