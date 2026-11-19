import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
} from '@capacitor-community/admob';

const viteEnv = (
  import.meta as unknown as {
    env?: { DEV?: boolean; VITE_ADMOB_REWARDED_ID?: string };
  }
).env;

const GOOGLE_TEST_REWARDED_AD_UNIT_ID =
  'ca-app-pub-3940256099942544/5224354917';

export const REWARDED_AD_UNIT_ID =
  viteEnv?.VITE_ADMOB_REWARDED_ID?.trim() ||
  (viteEnv?.DEV ? GOOGLE_TEST_REWARDED_AD_UNIT_ID : '');

export interface AdConsentResult {
  consentObtained: boolean;
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  provider: 'ump_native' | 'unavailable';
  error?: string;
}

export interface NativeRewardedAdResult {
  rewarded: boolean;
  message?: string;
}

let initialized = false;
let adReady = false;
let consentAllowsAds = false;
let consentFlow: Promise<AdConsentResult> | null = null;
let preloadFlow: Promise<boolean> | null = null;
let lastAdLoadMessage: string | null = null;
let lastConsentMessage: string | null = null;

function getNativeErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown };
    const message =
      typeof record.message === 'string' ? record.message : '';
    const code = record.code == null ? '' : String(record.code);
    return [message, code].filter(Boolean).join(' ');
  }
  return '';
}

function getUserFacingAdError(error: unknown, stage: 'load' | 'show'): string {
  const raw = getNativeErrorText(error).toLowerCase();
  if (/no.?fill|no ads available|inventory/.test(raw)) {
    return 'No rewarded ad is available right now. Please try again later.';
  }
  if (/network|internet|connection|timeout|unreachable/.test(raw)) {
    return 'The ad could not connect. Check your internet connection and try again.';
  }
  if (/not loaded|not ready|already showing|invalid state/.test(raw)) {
    return 'The rewarded ad is not ready yet. Please try again in a moment.';
  }
  return stage === 'load'
    ? 'A rewarded ad could not be loaded. Please try again shortly.'
    : 'The rewarded ad could not be opened. No reward was given.';
}

export function isAdMobAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export function isRewardedAdReady(): boolean {
  return adReady && consentAllowsAds && isAdMobAvailable();
}

async function initializeAdsSdk(): Promise<void> {
  if (initialized) return;
  await AdMob.initialize();
  initialized = true;
}

/**
 * Load a rewarded ad once at a time. The boolean result is also used by the
 * click path, so a failed load can be reported to the player instead of silently
 * returning without feedback.
 */
export async function preloadRewardedAd(): Promise<boolean> {
  if (!isAdMobAvailable() || !consentAllowsAds || !initialized) {
    adReady = false;
    return false;
  }

  if (!REWARDED_AD_UNIT_ID) {
    adReady = false;
    lastAdLoadMessage =
      'The rewarded ad unit is not configured in this build. Please update the app.';
    console.error('[AdMob] Missing VITE_ADMOB_REWARDED_ID.');
    return false;
  }

  if (adReady) return true;
  if (preloadFlow) return preloadFlow;

  const currentLoad = (async () => {
    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID });
      adReady = true;
      lastAdLoadMessage = null;
      console.info('[AdMob] Rewarded ad loaded:', REWARDED_AD_UNIT_ID);
      return true;
    } catch (error) {
      adReady = false;
      lastAdLoadMessage = getUserFacingAdError(error, 'load');
      console.warn('[AdMob] Rewarded ad preload failed:', error);
      return false;
    }
  })();

  preloadFlow = currentLoad;
  try {
    return await currentLoad;
  } finally {
    if (preloadFlow === currentLoad) preloadFlow = null;
  }
}

/**
 * Refresh UMP at app launch. When called from Settings, present the dedicated
 * privacy-options form if Google says the publisher must expose that entry point.
 * Never initialize or request ads unless UMP reports canRequestAds=true.
 */
export async function requestAdConsent(options?: {
  showPrivacyOptions?: boolean;
}): Promise<AdConsentResult> {
  if (!isAdMobAvailable()) {
    consentAllowsAds = false;
    adReady = false;
    lastConsentMessage =
      'Ad privacy controls are available in the installed Android app.';
    return {
      consentObtained: false,
      canRequestAds: false,
      privacyOptionsRequired: false,
      provider: 'unavailable',
      error: lastConsentMessage,
    };
  }

  // Serialize overlapping startup / Settings requests. If Settings is opened
  // during startup, wait for startup and then still honor the privacy-options action.
  if (consentFlow) {
    const pending = consentFlow;
    const pendingResult = await pending;
    if (!options?.showPrivacyOptions) return pendingResult;
  }

  consentFlow = (async () => {
    try {
      let info = await AdMob.requestConsentInfo();
      let privacyOptionsRequired =
        info.privacyOptionsRequirementStatus === 'REQUIRED';

      if (options?.showPrivacyOptions && privacyOptionsRequired) {
        await AdMob.showPrivacyOptionsForm();
        info = await AdMob.requestConsentInfo();
        privacyOptionsRequired =
          info.privacyOptionsRequirementStatus === 'REQUIRED';
      }

      if (
        info.isConsentFormAvailable &&
        info.status === AdmobConsentStatus.REQUIRED
      ) {
        info = await AdMob.showConsentForm();
        privacyOptionsRequired =
          info.privacyOptionsRequirementStatus === 'REQUIRED';
      }

      consentAllowsAds = Boolean(info.canRequestAds);
      if (consentAllowsAds) {
        lastConsentMessage = null;
        await initializeAdsSdk();
        // Preload failure does not invalidate consent; the next tap can retry.
        await preloadRewardedAd();
      } else {
        adReady = false;
        lastConsentMessage =
          'Google has not enabled ad requests yet. Complete the privacy consent step in Settings and try again.';
      }

      return {
        consentObtained: consentAllowsAds,
        canRequestAds: consentAllowsAds,
        privacyOptionsRequired,
        provider: 'ump_native' as const,
      };
    } catch (error) {
      consentAllowsAds = false;
      adReady = false;
      lastConsentMessage =
        'Google privacy consent could not be checked. Check your connection, then retry in Settings.';
      console.warn('[AdMob] UMP consent flow failed; ads remain disabled:', error);
      return {
        consentObtained: false,
        canRequestAds: false,
        privacyOptionsRequired: false,
        provider: 'ump_native' as const,
        error: getNativeErrorText(error) || lastConsentMessage,
      };
    } finally {
      consentFlow = null;
    }
  })();

  return consentFlow;
}

/** Startup entry point: UMP first, Mobile Ads SDK second, then preload. */
export async function initAdMob(): Promise<AdConsentResult> {
  return requestAdConsent();
}

/**
 * Show a prepared native rewarded ad. Failure is returned with a concise
 * player-facing message; the raw native error remains in Logcat/console.
 * The plugin promise resolves with the reward only after the user earns it.
 */
export async function showNativeRewardedAd(): Promise<NativeRewardedAdResult> {
  if (!isAdMobAvailable()) {
    return {
      rewarded: false,
      message: 'Rewarded ads are available in the installed Android app.',
    };
  }

  // A player may tap before the startup consent request has completed.
  if (!consentAllowsAds && consentFlow) {
    await consentFlow;
  }

  if (!consentAllowsAds) {
    return {
      rewarded: false,
      message:
        lastConsentMessage ??
        'Ad privacy consent is not complete. Open Settings → Ad Privacy & Consent.',
    };
  }

  if (!initialized) {
    return {
      rewarded: false,
      message: 'The ad service is still starting. Please try again in a moment.',
    };
  }

  if (!REWARDED_AD_UNIT_ID) {
    return {
      rewarded: false,
      message:
        'The rewarded ad unit is missing from this build. Please install the latest app update.',
    };
  }

  if (!adReady) {
    const loaded = await preloadRewardedAd();
    if (!loaded) {
      return {
        rewarded: false,
        message:
          lastAdLoadMessage ??
          'No rewarded ad is ready right now. Please try again later.',
      };
    }
  }

  try {
    const reward = await AdMob.showRewardVideoAd({
      adId: REWARDED_AD_UNIT_ID,
    });
    adReady = false;

    const amount = Number(reward?.amount);
    const type = String(reward?.type ?? '').trim();
    const earned = Number.isFinite(amount) && amount > 0 && type.length > 0;

    if (!earned) {
      console.warn('[AdMob] Rewarded ad closed without a valid reward item:', reward);
      void preloadRewardedAd();
      return {
        rewarded: false,
        message: 'The ad ended without a confirmed reward. No game currency was added.',
      };
    }

    console.info('[AdMob] Reward earned:', { amount, type });
    void preloadRewardedAd();
    return { rewarded: true };
  } catch (error) {
    adReady = false;
    const message = getUserFacingAdError(error, 'show');
    console.warn('[AdMob] Rewarded ad was not completed:', error);
    void preloadRewardedAd();
    return { rewarded: false, message };
  }
}
