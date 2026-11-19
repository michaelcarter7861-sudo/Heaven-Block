import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_PACKAGE_ID,
  APP_VERSION,
  DAY_THEME_COLOR,
  hideNativeSplashScreen,
  NIGHT_THEME_COLOR,
  registerAndroidBackHandler,
  registerAppLifecycleHandler,
  resolveBackNavigationAction,
  syncSystemThemeChrome,
} from './nativeBridge';

test('resolveBackNavigationAction follows Play Store Android UX hierarchy', () => {
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: true,
      appView: 'puzzle',
      phase: 'playing',
    }),
    'close_modal'
  );
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: true,
      appView: 'haven',
      phase: 'title',
    }),
    'close_modal'
  );
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: false,
      appView: 'haven',
      phase: 'playing',
    }),
    'return_to_puzzle'
  );
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: false,
      appView: 'puzzle',
      phase: 'playing',
    }),
    'prompt_leave_match'
  );
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: false,
      appView: 'puzzle',
      phase: 'paused',
    }),
    'resume_paused'
  );
  assert.equal(
    resolveBackNavigationAction({
      hasOpenModal: false,
      appView: 'puzzle',
      phase: 'title',
    }),
    'exit_app'
  );
});

test('hideNativeSplashScreen gracefully no-ops on web and invokes plugin on native', async () => {
  assert.equal(await hideNativeSplashScreen({}), false);

  let calledWithFade = 0;
  const mockWin = {
    Capacitor: {
      Plugins: {
        SplashScreen: {
          hide: async (opts?: { fadeOutDuration?: number }) => {
            calledWithFade = opts?.fadeOutDuration ?? 0;
          },
        },
      },
    },
  };
  assert.equal(await hideNativeSplashScreen(mockWin), true);
  assert.ok(calledWithFade > 0);
});

test('syncSystemThemeChrome updates native StatusBar style and color cleanly', async () => {
  const calls: Array<{ fn: string; arg: unknown }> = [];
  const mockWin = {
    Capacitor: {
      Plugins: {
        StatusBar: {
          setStyle: async (arg: { style: string }) => {
            calls.push({ fn: 'setStyle', arg });
          },
          setBackgroundColor: async (arg: { color: string }) => {
            calls.push({ fn: 'setBackgroundColor', arg });
          },
        },
      },
    },
  };

  await syncSystemThemeChrome(true, mockWin);
  await syncSystemThemeChrome(false, mockWin);

  assert.deepEqual(calls, [
    { fn: 'setStyle', arg: { style: 'DARK' } },
    { fn: 'setBackgroundColor', arg: { color: NIGHT_THEME_COLOR } },
    { fn: 'setStyle', arg: { style: 'LIGHT' } },
    { fn: 'setBackgroundColor', arg: { color: DAY_THEME_COLOR } },
  ]);
});

test('registerAndroidBackHandler only calls exitApp when callback returns exit', () => {
  const backListeners: Array<() => void> = [];
  let exitCount = 0;
  let removed = false;

  const mockWin = {
    Capacitor: {
      Plugins: {
        App: {
          addListener: (event: string, fn: () => void) => {
            if (event === 'backButton') backListeners.push(fn);
            return {
              remove: () => {
                removed = true;
              },
            };
          },
          exitApp: () => {
            exitCount += 1;
          },
        },
      },
    },
  };

  let mode: 'handled' | 'exit' = 'handled';
  const cleanup = registerAndroidBackHandler(() => mode, mockWin);
  assert.equal(backListeners.length, 1);

  backListeners[0]();
  assert.equal(exitCount, 0);

  mode = 'exit';
  backListeners[0]();
  assert.equal(exitCount, 1);

  cleanup();
  assert.equal(removed, true);
});

test('registerAppLifecycleHandler dispatches pause and resume callbacks', () => {
  const stateListeners: Array<(e: { isActive?: boolean }) => void> = [];
  let pauses = 0;
  let resumes = 0;

  const mockWin = {
    Capacitor: {
      Plugins: {
        App: {
          addListener: (
            event: string,
            fn: (e: { isActive?: boolean }) => void
          ) => {
            if (event === 'appStateChange') stateListeners.push(fn);
            return { remove: () => {} };
          },
        },
      },
    },
  };

  const cleanup = registerAppLifecycleHandler(
    {
      onPause: () => {
        pauses += 1;
      },
      onResume: () => {
        resumes += 1;
      },
    },
    mockWin
  );

  assert.equal(stateListeners.length, 1);
  stateListeners[0]({ isActive: false });
  stateListeners[0]({ isActive: true });
  cleanup();

  assert.equal(pauses, 1);
  assert.equal(resumes, 1);
  assert.equal(APP_VERSION, '1.0.0');
  assert.equal(APP_PACKAGE_ID, 'com.havenblocks.cozyroom');
});
