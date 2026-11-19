/**
 * Clean tactile haptic feedback wrapper.
 * Uses `navigator.vibrate` in browser/Android WebView and detects an optional
 * Capacitor Haptics plugin (`window.Capacitor?.Plugins?.Haptics`) for native release.
 */
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

interface CapacitorHapticsBridge {
  impact?: (opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
  notification?: (opts: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>;
}

const VIBRATE_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 12,
  medium: 22,
  heavy: [24, 24, 34],
  success: [18, 35, 28],
  warning: [30, 40, 20],
};

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function triggerHaptic(style: HapticStyle): void {
  if (!hapticsEnabled || typeof window === 'undefined') return;

  try {
    const cap = (
      window as unknown as {
        Capacitor?: { Plugins?: { Haptics?: CapacitorHapticsBridge } };
      }
    ).Capacitor;
    const nativeHaptics = cap?.Plugins?.Haptics;

    if (nativeHaptics) {
      if (style === 'success' && nativeHaptics.notification) {
        void nativeHaptics.notification({ type: 'SUCCESS' });
        return;
      }
      if (style === 'warning' && nativeHaptics.notification) {
        void nativeHaptics.notification({ type: 'WARNING' });
        return;
      }
      if (nativeHaptics.impact) {
        const capStyle =
          style === 'light' ? 'LIGHT' : style === 'heavy' ? 'HEAVY' : 'MEDIUM';
        void nativeHaptics.impact({ style: capStyle });
        return;
      }
    }

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(VIBRATE_PATTERNS[style]);
    }
  } catch {
    // Ignore haptic failures on unsupported platforms
  }
}
