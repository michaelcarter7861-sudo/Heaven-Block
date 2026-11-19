const _viteEnv = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env;

export const REWARDED_AD_UNIT_ID: string =
  (_viteEnv
    ? (import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined)
    : undefined) || 'ca-app-pub-3940256099942544/5224354917';

interface AdMobNativePlugin {
  initialize(opts?: { requestTrackingAuthorization?: boolean }): Promise<void>;
  prepareRewardVideoAd(opts: { adId: string }): Promise<void>;
  showRewardVideoAd(): Promise<unknown>;
  addListener(
    event: string,
    handler: (data: unknown) => void
  ): Promise<{ remove(): void }>;
}

function getNativeAdMob(): AdMobNativePlugin | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap?.Plugins?.AdMob as AdMobNativePlugin | undefined) ?? null;
}

let _initialized = false;
let _adReady = false;

export async function initAdMob(): Promise<void> {
  if (_initialized) return;
  const admob = getNativeAdMob();
  if (!admob) return;
  try {
    await admob.initialize({ requestTrackingAuthorization: false });
    _initialized = true;
    await preloadRewardedAd();
  } catch (err) {
    console.warn('[AdMob] init failed:', err);
  }
}

export async function preloadRewardedAd(): Promise<void> {
  const admob = getNativeAdMob();
  if (!admob) return;
  try {
    await admob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID });
    _adReady = true;
  } catch (err) {
    _adReady = false;
    console.warn('[AdMob] preload failed:', err);
  }
}

export function isAdMobAvailable(): boolean {
  return getNativeAdMob() !== null;
}

export function isRewardedAdReady(): boolean {
  return _adReady && isAdMobAvailable();
}
