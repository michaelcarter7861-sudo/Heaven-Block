import type { AppView, GamePhase } from './types';

export const APP_VERSION = '1.0.0';
export const APP_PACKAGE_ID = 'com.havenblocks.cozyroom';

export const DAY_THEME_COLOR = '#1F3A34';
export const NIGHT_THEME_COLOR = '#080705';

export type BackNavigationAction =
  | 'close_modal'
  | 'return_to_puzzle'
  | 'prompt_leave_match'
  | 'resume_paused'
  | 'exit_app';

interface CapacitorPluginHandle {
  remove?: () => Promise<void> | void;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: {
      addListener?: (
        eventName: string,
        listener: (event: { isActive?: boolean; canGoBack?: boolean }) => void
      ) => Promise<CapacitorPluginHandle> | CapacitorPluginHandle;
      exitApp?: () => Promise<void> | void;
    };
    SplashScreen?: {
      hide?: (options?: { fadeOutDuration?: number }) => Promise<void> | void;
    };
    StatusBar?: {
      setStyle?: (options: { style: 'DARK' | 'LIGHT' }) => Promise<void> | void;
      setBackgroundColor?: (options: { color: string }) => Promise<void> | void;
      setOverlaysWebView?: (options: { overlay: boolean }) => Promise<void> | void;
    };
  };
}

function getCapacitor(win?: unknown): CapacitorGlobal | undefined {
  const target =
    win ?? (typeof window !== 'undefined' ? (window as unknown) : undefined);
  if (!target || typeof target !== 'object') return undefined;
  return (target as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/**
 * Pure deterministic Android hardware-back router:
 * 1. If any modal/overlay is open -> close the topmost modal.
 * 2. If inside My Cozy Haven -> return to Puzzle view.
 * 3. If actively playing -> pause and open LeaveMatchModal guard.
 * 4. If paused -> resume active board cleanly.
 * 5. Otherwise (Title / finished screen) -> exit Android app cleanly.
 */
export function resolveBackNavigationAction(state: {
  hasOpenModal: boolean;
  appView: AppView;
  phase: GamePhase;
}): BackNavigationAction {
  if (state.hasOpenModal) return 'close_modal';
  if (state.appView === 'haven') return 'return_to_puzzle';
  if (state.phase === 'playing') return 'prompt_leave_match';
  if (state.phase === 'paused') return 'resume_paused';
  return 'exit_app';
}

/**
 * Dismisses the native Capacitor Android 12+ SplashScreen once React is mounted.
 */
export async function hideNativeSplashScreen(win?: unknown): Promise<boolean> {
  const splash = getCapacitor(win)?.Plugins?.SplashScreen;
  if (!splash?.hide) return false;
  try {
    await splash.hide({ fadeOutDuration: 300 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronizes browser `<meta name="theme-color">` and native Capacitor StatusBar
 * icon contrast / background for Edge-to-Edge Android 15/16 devices.
 */
export async function syncSystemThemeChrome(
  nightCandleMode: boolean,
  win?: unknown
): Promise<void> {
  const color = nightCandleMode ? NIGHT_THEME_COLOR : DAY_THEME_COLOR;

  if (typeof document !== 'undefined') {
    const existing = document.querySelector('meta[name="theme-color"]:not([media])');
    if (existing) {
      existing.setAttribute('content', color);
    } else if (document.head) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', color);
      document.head.appendChild(meta);
    }
  }

  const statusBar = getCapacitor(win)?.Plugins?.StatusBar;
  if (!statusBar) return;

  try {
    // In Capacitor StatusBar: 'DARK' means light icons for dark backgrounds; 'LIGHT' means dark icons for light backgrounds
    if (statusBar.setStyle) {
      await statusBar.setStyle({ style: nightCandleMode ? 'DARK' : 'LIGHT' });
    }
    if (statusBar.setBackgroundColor) {
      await statusBar.setBackgroundColor({ color });
    }
  } catch {
    // Ignore unsupported platform errors on WebView / older Android builds
  }
}

/**
 * Registers the Android hardware back button listener when running under Capacitor.
 * Calls `Capacitor.Plugins.App.exitApp()` only when `onBack()` returns `'exit'`.
 */
export function registerAndroidBackHandler(
  onBack: () => 'handled' | 'exit',
  win?: unknown
): () => void {
  const appPlugin = getCapacitor(win)?.Plugins?.App;
  if (!appPlugin?.addListener) {
    return () => {};
  }

  let disposed = false;
  let listenerHandle: CapacitorPluginHandle | null = null;

  const maybePromise = appPlugin.addListener('backButton', () => {
    const result = onBack();
    if (result === 'exit' && appPlugin.exitApp) {
      try {
        void appPlugin.exitApp();
      } catch {
        // Ignore exit failures
      }
    }
  });

  if (maybePromise && typeof (maybePromise as Promise<CapacitorPluginHandle>).then === 'function') {
    void (maybePromise as Promise<CapacitorPluginHandle>).then((handle) => {
      if (disposed) {
        void handle?.remove?.();
      } else {
        listenerHandle = handle;
      }
    });
  } else {
    listenerHandle = maybePromise as CapacitorPluginHandle;
  }

  return () => {
    disposed = true;
    void listenerHandle?.remove?.();
  };
}

/**
 * Registers native Android app background/foreground lifecycle callbacks
 * so audio suspends cleanly and local progress flushes immediately on backgrounding.
 */
export function registerAppLifecycleHandler(
  handlers: { onPause: () => void; onResume: () => void },
  win?: unknown
): () => void {
  const appPlugin = getCapacitor(win)?.Plugins?.App;
  if (!appPlugin?.addListener) {
    return () => {};
  }

  let disposed = false;
  let listenerHandle: CapacitorPluginHandle | null = null;

  const maybePromise = appPlugin.addListener('appStateChange', (event) => {
    if (event?.isActive) {
      handlers.onResume();
    } else {
      handlers.onPause();
    }
  });

  if (maybePromise && typeof (maybePromise as Promise<CapacitorPluginHandle>).then === 'function') {
    void (maybePromise as Promise<CapacitorPluginHandle>).then((handle) => {
      if (disposed) {
        void handle?.remove?.();
      } else {
        listenerHandle = handle;
      }
    });
  } else {
    listenerHandle = maybePromise as CapacitorPluginHandle;
  }

  return () => {
    disposed = true;
    void listenerHandle?.remove?.();
  };
}
