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

/**
 * Production builds must receive the real ad-unit ID through
 * VITE_ADMOB_REWARDED_ID. The Google sample ID is used only in Vite dev mode.
 */
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

let initialized = false;
let adReady = false;
let consentAllowsAds = false;
let consentFlow: Promise<AdConsentResult> | null = null;

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

export async function preloadRewardedAd(): Promise<void> {
  if (!isAdMobAvailable() || !consentAllowsAds || !initialized) {
    adReady = false;
    return;
  }

  if (!REWARDED_AD_UNIT_ID) {
    adReady = false;
    console.error(
      '[AdMob] Missing VITE_ADMOB_REWARDED_ID. Refusing to request a production ad.'
    );
    return;
  }

  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID });
    adReady = true;
  } catch (error) {
    adReady = false;
    console.warn('[AdMob] Rewarded ad preload failed:', error);
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
    return {
      consentObtained: false,
      canRequestAds: false,
      privacyOptionsRequired: false,
      provider: 'unavailable',
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
        info.privacyOptionsRequirementStatus ===
        'REQUIRED';

      if (options?.showPrivacyOptions && privacyOptionsRequired) {
        await AdMob.showPrivacyOptionsForm();
        // Re-read the UMP state after the user closes the privacy options form.
        info = await AdMob.requestConsentInfo();
        privacyOptionsRequired =
          info.privacyOptionsRequirementStatus ===
          PrivacyOptionsRequirementStatus.REQUIRED;
      }

      // A privacy-options form and an initial consent form serve different
      // purposes. If UMP still reports consent REQUIRED, present that form too.
      if (
        info.isConsentFormAvailable &&
        info.status === AdmobConsentStatus.REQUIRED
      ) {
        info = await AdMob.showConsentForm();
        privacyOptionsRequired =
          info.privacyOptionsRequirementStatus ===
          PrivacyOptionsRequirementStatus.REQUIRED;
      }

      consentAllowsAds = Boolean(info.canRequestAds);
      if (consentAllowsAds) {
        await initializeAdsSdk();
        await preloadRewardedAd();
      } else {
        adReady = false;
      }

      return {
        consentObtained: Boolean(info.canRequestAds),
        canRequestAds: consentAllowsAds,
        privacyOptionsRequired,
        provider: 'ump_native' as const,
      };
    } catch (error) {
      // Fail closed: a UMP/network/plugin error must never enable ad requests.
      consentAllowsAds = false;
      adReady = false;
      console.warn('[AdMob] UMP consent flow failed; ads remain disabled:', error);
      return {
        consentObtained: false,
        canRequestAds: false,
        privacyOptionsRequired: false,
        provider: 'ump_native' as const,
        error: error instanceof Error ? error.message : String(error),
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
 * Show one native rewarded ad. The plugin's resolved reward item is the sole
 * authority for granting the in-game reward; dismissal or load/show failure
 * returns false. No timer or browser simulation is reachable from this method.
 */
export async function showNativeRewardedAd(): Promise<boolean> {
  if (
    !isAdMobAvailable() ||
    !consentAllowsAds ||
    !initialized ||
    !REWARDED_AD_UNIT_ID
  ) {
    return false;
  }

  if (!adReady) {
    await preloadRewardedAd();
  }
  if (!adReady) return false;

  try {
    const reward = await AdMob.showRewardVideoAd();
    adReady = false;

    // The plugin resolves with the earned reward item. Do not also grant from
    // the Rewarded event: that would double-credit the same completed ad.
    const amount = Number(reward?.amount);
    const type = String(reward?.type ?? '').trim();
    const earned = Number.isFinite(amount) && amount > 0 && type.length > 0;

    void preloadRewardedAd();
    return earned;
  } catch (error) {
    adReady = false;
    console.warn('[AdMob] Rewarded ad was not completed:', error);
    void preloadRewardedAd();
    return false;
  }
}
