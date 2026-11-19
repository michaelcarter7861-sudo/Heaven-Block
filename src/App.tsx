import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Flame,
  Gem,
  HelpCircle,
  Home,
  Inbox,
  LayoutGrid,
  Moon,
  Pause,
  Plus,
  PlusCircle,
  RotateCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameBoard } from './components/GameBoard';
import {
  GameOverModal,
  HelpModal,
  LeaveMatchModal,
  PauseModal,
  VictoryModal,
} from './components/GameModals';
import { JournalModal } from './components/JournalModal';
import {
  DailyStreakModal,
  PrivacyTermsModal,
  RateUsModal,
  RewardedAdModal,
  StarterBundleModal,
} from './components/MonetizationModals';
import { PiecePreview } from './components/PiecePreview';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { TitleScreen } from './components/TitleScreen';
import { cozyAudio } from './game/audio';
import { setHapticsEnabled, triggerHaptic } from './game/haptics';
import {
  applyFurnitureStyle,
  countUnlockedFurniture,
  getRoomCompletion,
  HAVEN_CHAPTER_META,
  ROOM_COMPLETION_BONUS_GEMS,
} from './game/haven';
import { shouldAwardSeedPack } from './game/herbarium';
import {
  claimMilestoneReward,
  countClaimableMilestones,
  createDefaultLifetimeStats,
  createDefaultPetBondState,
  giveDailyPetTreat,
  type MilestoneProgressContext,
} from './game/journal';
import {
  BOARD_SHAPE_META,
  buildGridFromLevel,
  createDuelDefinition,
  createLevel1OpeningTray,
  createLevel2OpeningTray,
  createZenDefinition,
  getLevelDefinition,
  getLevelDifficultyMeta,
  getLevelTrayOptions,
  SPECIAL_BLOCK_META,
} from './game/levels';
import {
  canAutoShowDailyStreakPopup,
  canClaimDailyStreak,
  claimDailyStreakReward,
  computeStoryVictoryGemDrop,
  getDailyPuzzleSeed,
  getTodayDateKey,
  isDailyPuzzleSeed,
  isNativePlatform,
  purchaseStoreProduct,
  recordDailyPuzzleRun,
  requestAdConsent,
  restorePlayStorePurchasesAsync,
  shouldTriggerRateUsPrompt,
  shouldTriggerSmartStarterOffer,
  showRewardedAd,
  subscribeRewardedAd,
  triggerNativeInAppReview,
  type RewardedAdPreviewStatus,
} from './game/monetization';
import { initAdMob } from './game/admob';
import {
  hideNativeSplashScreen,
  registerAndroidBackHandler,
  registerAppLifecycleHandler,
  resolveBackNavigationAction,
  syncSystemThemeChrome,
} from './game/nativeBridge';
import {
  generateSeedCode,
  getShapeDimensions,
  hashSeedCode,
  MATERIAL_META,
  mulberry32,
  normalizeSeedCode,
  rotatePieceCW,
} from './game/shapes';
import {
  applyStoreProductFulfillment,
  FREE_GEMS_AD_AMOUNT,
  grantFreeAdGems,
  purchaseGemShopItem,
  type ShopAccountSnapshot,
} from './game/shop';
import {
  applyPlacement,
  applyReviveClear3x3,
  checkHasAnyPlayableMove,
  cloneGrid,
  generateSolvableTray,
  previewPlacement,
  type TrayGenerationOptions,
} from './game/solver';
import {
  createDefaultPersistedState,
  exportSaveBackupString,
  importSaveBackupString,
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY,
} from './game/storage';
import {
  GRID_SIZE,
  type AppView,
  type ClearedParticleBurst,
  type FurnitureStyleId,
  type GameMode,
  type GamePhase,
  type GemShopItemId,
  type Grid8x8,
  type HavenChapterId,
  type HavenProgress,
  type HerbariumProgress,
  type JitTipId,
  type JournalTabId,
  type LevelDefinition,
  type LifetimeStats,
  type MaterialType,
  type MonetizationState,
  type PersistedState,
  type PetBondState,
  type PieceInstance,
  type PieceSource,
  type PlacementPreview,
  type PlayerSettings,
  type RunStats,
  type ShopTabId,
  type StoreProductId,
  type TileSkinId,
  type UndoSnapshot,
  type WindowThemeId,
} from './game/types';

const HavenRoom = React.lazy(() =>
  import('./components/HavenRoom').then((m) => ({ default: m.HavenRoom }))
);

interface DragSession {
  source: PieceSource;
  piece: PieceInstance;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  hasMoved: boolean;
}

interface FloatingBanner {
  id: number;
  text: string;
  subtext?: string;
}

const MAX_UNDO_HISTORY = 15;
const TOUCH_THUMB_Y_OFFSET = -76;
const MOUSE_LIFT_Y_OFFSET = -8;

const MATERIAL_PARTICLE_COLORS: Record<
  MaterialType,
  { colorHex: string; accentHex: string }
> = {
  honey_oak: { colorHex: '#D98A3A', accentHex: '#F3C677' },
  glazed_ceramic: { colorHex: '#2C8C7C', accentHex: '#A5E8D5' },
  sea_glass: { colorHex: '#E07A2F', accentHex: '#FDE68A' },
  woven_rattan: { colorHex: '#A67C52', accentHex: '#EAD3B1' },
};

function getFirstAvailableSource(
  tray: (PieceInstance | null)[],
  pocket: PieceInstance | null
): PieceSource | null {
  for (let i = 0; i < tray.length; i++) {
    if (tray[i] !== null) return { kind: 'tray', index: i };
  }
  if (pocket !== null) return { kind: 'pocket' };
  return null;
}

function getPieceAtSource(
  source: PieceSource | null,
  tray: (PieceInstance | null)[],
  pocket: PieceInstance | null
): PieceInstance | null {
  if (!source) return null;
  if (source.kind === 'pocket') return pocket;
  return tray[source.index] ?? null;
}

function computeStarsForLevel(score: number, levelDef: LevelDefinition): number {
  const [s1, s2, s3] = levelDef.starThresholds;
  if (score >= s3) return 3;
  if (score >= s2) return 2;
  if (score >= s1) return 1;
  return 1;
}

function getTrayOptionsForLevel(
  levelDef: LevelDefinition,
  ddaBoost = false
): TrayGenerationOptions {
  return getLevelTrayOptions(levelDef, ddaBoost);
}

function toTraySlots(pieces: PieceInstance[]): (PieceInstance | null)[] {
  return [pieces[0] ?? null, pieces[1] ?? null, pieces[2] ?? null];
}

export default function App() {
  const initialSaved = useMemo(() => loadPersistedState(), []);
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const autostart = urlParams.get('autostart') === '1';
  const dailyShortcut = urlParams.get('daily') === '1';
  const havenShortcut = urlParams.get('haven') === '1';
  const duelParam =
    urlParams.get('duel') || (dailyShortcut ? getDailyPuzzleSeed() : null);

  const [nightCandleMode, setNightCandleMode] = useState<boolean>(
    initialSaved.nightCandleMode
  );
  const [settings, setSettings] = useState<PlayerSettings>(
    initialSaved.settings
  );
  const muted = !settings.soundEnabled;
  const [bestScore, setBestScore] = useState<number>(initialSaved.bestScore);
  const [duelBestScore, setDuelBestScore] = useState<number>(
    initialSaved.duelBestScore
  );
  const [cozyStars, setCozyStars] = useState<number>(initialSaved.cozyStars);
  const [cozyGems, setCozyGems] = useState<number>(initialSaved.cozyGems);
  const [unlockedPremiumItems, setUnlockedPremiumItems] = useState<string[]>(
    initialSaved.unlockedPremiumItems
  );
  const [activeTileSkin, setActiveTileSkin] = useState<TileSkinId>(
    initialSaved.activeTileSkin
  );
  const [activeWindowTheme, setActiveWindowTheme] = useState<WindowThemeId>(
    initialSaved.activeWindowTheme
  );
  const [unlockedLevel, setUnlockedLevel] = useState<number>(
    initialSaved.unlockedLevel
  );
  const [fireflyStreak, setFireflyStreak] = useState<number>(
    initialSaved.fireflyStreak
  );
  const [preLossStreak, setPreLossStreak] = useState<number>(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>(
    initialSaved.levelStars
  );
  const [levelLosses, setLevelLosses] = useState<Record<number, number>>(
    initialSaved.levelLosses
  );
  const [haven, setHaven] = useState<HavenProgress>(initialSaved.haven);
  const [herbarium, setHerbarium] = useState<HerbariumProgress>(
    initialSaved.herbarium
  );
  const [monetization, setMonetization] = useState<MonetizationState>(
    initialSaved.monetization
  );
  const [appView, setAppView] = useState<AppView>(() =>
    havenShortcut ? 'haven' : 'puzzle'
  );
  const [petCelebrating, setPetCelebrating] = useState<boolean>(false);
  const [adStatus, setAdStatus] = useState<RewardedAdPreviewStatus | null>(null);
  const [showBundleModal, setShowBundleModal] = useState<boolean>(false);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [shopInitialTab, setShopInitialTab] = useState<ShopTabId>('bundles');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showRateUsModal, setShowRateUsModal] = useState<boolean>(false);
  const [showLeaveMatchModal, setShowLeaveMatchModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [dismissedTips, setDismissedTips] = useState<JitTipId[]>(
    () => initialSaved.dismissedTips ?? []
  );
  const [firstSofaPromptDone, setFirstSofaPromptDone] = useState<boolean>(() =>
    Boolean(initialSaved.firstSofaPromptDone)
  );
  const [completedDailyDates, setCompletedDailyDates] = useState<string[]>(
    () => initialSaved.completedDailyDates ?? []
  );
  const [dailyBestScore, setDailyBestScore] = useState<number>(
    () => initialSaved.dailyBestScore ?? 0
  );
  const [petBond, setPetBond] = useState<PetBondState>(
    () => initialSaved.petBond ?? createDefaultPetBondState()
  );
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(
    () => initialSaved.lifetimeStats ?? createDefaultLifetimeStats()
  );
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>(
    () => initialSaved.claimedMilestones ?? []
  );
  const [rewardedCompletedChapters, setRewardedCompletedChapters] = useState<
    HavenChapterId[]
  >(() => initialSaved.rewardedCompletedChapters ?? []);
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [journalInitialTab, setJournalInitialTab] =
    useState<JournalTabId>('calendar');
  const [showFirstSofaPrompt, setShowFirstSofaPrompt] = useState<boolean>(false);
  const [firstSofaPlacedStyle, setFirstSofaPlacedStyle] =
    useState<FurnitureStyleId | null>(null);
  const [showDailyStreakModal, setShowDailyStreakModal] = useState<boolean>(
    () =>
      !autostart &&
      !duelParam &&
      !havenShortcut &&
      canAutoShowDailyStreakPopup(
        initialSaved.monetization,
        initialSaved.unlockedLevel
      )
  );

  // Selected mode & level on Title Screen / Active Run
  const [mode, setMode] = useState<GameMode>(() =>
    duelParam ? 'duel' : initialSaved.activeRun?.mode ?? 'story'
  );
  const [levelNumber, setLevelNumber] = useState<number>(
    () => initialSaved.activeRun?.levelNumber ?? initialSaved.currentLevel
  );
  const [seedCode, setSeedCode] = useState<string>(() => {
    if (duelParam) return normalizeSeedCode(duelParam);
    return initialSaved.activeRun?.seedCode ?? 'HAVEN-84';
  });

  const [phase, setPhase] = useState<GamePhase>(() =>
    autostart || dailyShortcut || havenShortcut ? 'playing' : 'title'
  );

  // Derive current LevelDefinition deterministically for mode/level/seed
  const activeLevelDef = useMemo<LevelDefinition>(() => {
    if (mode === 'story') return getLevelDefinition(levelNumber);
    if (mode === 'duel') {
      return createDuelDefinition(mulberry32(hashSeedCode(seedCode)));
    }
    return createZenDefinition();
  }, [mode, levelNumber, seedCode]);

  const rngRef = useRef(
    mulberry32(
      initialSaved.activeRun?.rngState ?? hashSeedCode(seedCode)
    )
  );

  const [grid, setGrid] = useState<Grid8x8>(() => {
    if (initialSaved.activeRun?.grid && !duelParam) {
      return initialSaved.activeRun.grid;
    }
    const initRng = mulberry32(hashSeedCode(duelParam ? normalizeSeedCode(duelParam) : seedCode));
    const initDef =
      duelParam
        ? createDuelDefinition(initRng)
        : mode === 'story'
          ? getLevelDefinition(levelNumber)
          : mode === 'duel'
            ? createDuelDefinition(initRng)
            : createZenDefinition();
    const g = buildGridFromLevel(
      initDef,
      initRng,
      mode === 'story' && !duelParam ? initialSaved.fireflyStreak : 0
    );
    rngRef.current = initRng;
    return g;
  });

  const [tray, setTray] = useState<(PieceInstance | null)[]>(() => {
    if (initialSaved.activeRun?.tray && !duelParam) {
      return initialSaved.activeRun.tray;
    }
    if (mode === 'story' && levelNumber === 1 && !duelParam) {
      return createLevel1OpeningTray();
    }
    if (mode === 'story' && levelNumber === 2 && !duelParam) {
      return createLevel2OpeningTray();
    }
    const initDda = mode === 'story' && (initialSaved.levelLosses[levelNumber] ?? 0) >= 2;
    return toTraySlots(
      generateSolvableTray(
        grid,
        null,
        1,
        rngRef.current,
        getTrayOptionsForLevel(activeLevelDef, initDda)
      )
    );
  });

  const [pocket, setPocket] = useState<PieceInstance | null>(
    () => (duelParam ? null : initialSaved.activeRun?.pocket ?? null)
  );
  const [score, setScore] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.score ?? 0)
  );
  const [combo, setCombo] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.combo ?? 0)
  );
  const [bestCombo, setBestCombo] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.bestCombo ?? 0)
  );
  const [linesCleared, setLinesCleared] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.linesCleared ?? 0)
  );
  const [movesPlaced, setMovesPlaced] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.movesPlaced ?? 0)
  );
  const [mossCleared, setMossCleared] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.mossCleared ?? 0)
  );
  const [acornGemsCollected, setAcornGemsCollected] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.acornGemsCollected ?? 0)
  );
  const [bonusStarsEarned, setBonusStarsEarned] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.bonusStarsEarned ?? 0)
  );
  const [rotateCharges, setRotateCharges] = useState<number>(
    () => (duelParam ? 1 : initialSaved.activeRun?.rotateCharges ?? 1)
  );
  const [rotateGaugePct, setRotateGaugePct] = useState<number>(
    () => (duelParam ? 0 : initialSaved.activeRun?.rotateGaugePct ?? 0)
  );
  const [undoCharges, setUndoCharges] = useState<number>(
    () => (duelParam ? 1 : initialSaved.activeRun?.undoCharges ?? 1)
  );
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>(
    () => (duelParam ? [] : initialSaved.activeRun?.undoStack ?? [])
  );
  const [starsAwardedThisRun, setStarsAwardedThisRun] = useState<number>(0);
  const [gemsAwardedThisRun, setGemsAwardedThisRun] = useState<number>(0);
  const [starsDoubledThisRun, setStarsDoubledThisRun] = useState<boolean>(false);
  const [seedPackAwardedThisRun, setSeedPackAwardedThisRun] = useState<boolean>(false);

  const [selectedSource, setSelectedSource] = useState<PieceSource | null>(() =>
    getFirstAvailableSource(tray, pocket)
  );
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(
    null
  );
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [isOverPocket, setIsOverPocket] = useState<boolean>(false);
  const [clearingKeys, setClearingKeys] = useState<Set<string>>(new Set());
  const [particleBursts, setParticleBursts] = useState<ClearedParticleBurst[]>([]);
  const [boardShakeKey, setBoardShakeKey] = useState<number>(0);
  const [trayWaveId, setTrayWaveId] = useState<number>(1);
  const [banner, setBanner] = useState<FloatingBanner | null>(null);
  const [hasSavedRunFlag, setHasSavedRunFlag] = useState<boolean>(
    () => Boolean(initialSaved.activeRun && !duelParam)
  );

  const dragSessionRef = useRef<DragSession | null>(null);
  const pendingDragPointerRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pocketRef = useRef<HTMLButtonElement | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const particleTimerRef = useRef<number | null>(null);
  const lossRecordedRef = useRef<boolean>(false);
  const latestPayloadRef = useRef<PersistedState | null>(null);
  const lastSavedJsonRef = useRef<string | null>(null);
  const matchHistorySentinelRef = useRef<boolean>(false);

  const toggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const updateSettings = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    return subscribeRewardedAd((status) => setAdStatus(status));
  }, []);

  // Dismiss native Android 12+ SplashScreen once React is mounted
  useEffect(() => {
    void hideNativeSplashScreen();
  }, []);

  // Refresh UMP consent on every native app launch. The AdMob SDK and
  // rewarded inventory are initialized only after UMP permits ad requests.
  useEffect(() => {
    let active = true;
    void initAdMob().then((consent) => {
      if (!active) return;
      setMonetization((prev) => ({
        ...prev,
        adConsentStatus: consent.canRequestAds ? 'obtained' : 'unknown',
      }));
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync Tailwind dark class, reduced-motion preference, colorblind symbols, and Edge-to-Edge StatusBar chrome
  useEffect(() => {
    const root = document.documentElement;
    if (nightCandleMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (!settings.screenShakeEnabled) {
      root.classList.add('reduced-motion-pref');
    } else {
      root.classList.remove('reduced-motion-pref');
    }
    root.classList.toggle('colorblind-mode', Boolean(settings.colorblindMode));
    void syncSystemThemeChrome(nightCandleMode);
  }, [nightCandleMode, settings.screenShakeEnabled, settings.colorblindMode]);

  useEffect(() => {
    cozyAudio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    cozyAudio.setAmbientEnabled(Boolean(settings.ambientSoundEnabled));
  }, [settings.ambientSoundEnabled]);

  useEffect(() => {
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.hapticsEnabled]);

  useEffect(() => {
    document.body.dataset.state =
      phase === 'victory' ? 'gameover' : phase;
  }, [phase]);

  // Persist to localStorage
  useEffect(() => {
    const isFinished = phase === 'gameover' || phase === 'victory';
    const payload: PersistedState = {
      version: 2,
      bestScore,
      duelBestScore,
      cozyStars,
      cozyGems,
      unlockedPremiumItems,
      activeTileSkin,
      activeWindowTheme,
      unlockedLevel,
      currentLevel: levelNumber,
      fireflyStreak,
      levelStars,
      levelLosses,
      nightCandleMode,
      muted,
      settings,
      haven,
      herbarium,
      monetization,
      dismissedTips,
      firstSofaPromptDone,
      completedDailyDates,
      dailyBestScore,
      petBond,
      lifetimeStats,
      claimedMilestones,
      rewardedCompletedChapters,
      activeRun: isFinished
        ? null
        : {
            mode,
            levelNumber,
            grid,
            tray,
            pocket,
            score,
            combo,
            bestCombo,
            linesCleared,
            movesPlaced,
            mossCleared,
            acornGemsCollected,
            bonusStarsEarned,
            rotateCharges,
            rotateGaugePct,
            undoCharges,
            undoStack,
            seedCode,
            rngState: rngRef.current.getState(),
          },
    };
    latestPayloadRef.current = payload;
    lastSavedJsonRef.current = JSON.stringify(payload);
    savePersistedState(payload);
    setHasSavedRunFlag(payload.activeRun !== null && movesPlaced > 0);
  }, [
    bestScore,
    duelBestScore,
    cozyStars,
    cozyGems,
    unlockedPremiumItems,
    activeTileSkin,
    activeWindowTheme,
    unlockedLevel,
    levelNumber,
    fireflyStreak,
    levelStars,
    levelLosses,
    nightCandleMode,
    muted,
    settings,
    haven,
    herbarium,
    monetization,
    dismissedTips,
    firstSofaPromptDone,
    completedDailyDates,
    dailyBestScore,
    petBond,
    lifetimeStats,
    claimedMilestones,
    rewardedCompletedChapters,
    phase,
    mode,
    grid,
    tray,
    pocket,
    score,
    combo,
    bestCombo,
    linesCleared,
    movesPlaced,
    mossCleared,
    acornGemsCollected,
    bonusStarsEarned,
    rotateCharges,
    rotateGaugePct,
    undoCharges,
    undoStack,
    seedCode,
  ]);

  // App background/foreground lifecycle: suspend audio & flush localStorage save (Web + Capacitor Android)
  useEffect(() => {
    const flushAndSuspend = () => {
      cozyAudio.suspend();
      if (latestPayloadRef.current) {
        try {
          const currentStored = window.localStorage.getItem(STORAGE_KEY);
          if (
            (currentStored === null && lastSavedJsonRef.current === null) ||
            (currentStored !== null &&
              currentStored === lastSavedJsonRef.current)
          ) {
            savePersistedState(latestPayloadRef.current);
          }
        } catch {
          savePersistedState(latestPayloadRef.current);
        }
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushAndSuspend();
      } else {
        cozyAudio.resume();
      }
    };
    const handlePageHide = () => {
      flushAndSuspend();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    const unregisterNativeLifecycle = registerAppLifecycleHandler({
      onPause: flushAndSuspend,
      onResume: () => cozyAudio.resume(),
    });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      unregisterNativeLifecycle();
    };
  }, []);

  // Android / browser Back button interception during active gameplay
  useEffect(() => {
    if (phase === 'playing' && !matchHistorySentinelRef.current) {
      try {
        window.history.pushState({ havenMatchGuard: true }, '');
        matchHistorySentinelRef.current = true;
      } catch {
        // Ignore history restrictions in sandboxed frames
      }
    }
  }, [phase]);

  useEffect(() => {
    const handlePopState = () => {
      if (phase === 'playing') {
        try {
          window.history.pushState({ havenMatchGuard: true }, '');
        } catch {
          // Ignore
        }
        document.body.dataset.state = 'paused';
        setPhase('paused');
        setShowLeaveMatchModal(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase]);

  // Native Capacitor Android hardware Back button handler
  useEffect(() => {
    const hasOpenModal =
      showHelpModal ||
      showPrivacyModal ||
      showSettingsModal ||
      showRateUsModal ||
      showLeaveMatchModal ||
      showBundleModal ||
      showShopModal ||
      showJournalModal ||
      showDailyStreakModal;

    return registerAndroidBackHandler(() => {
      const action = resolveBackNavigationAction({
        hasOpenModal,
        appView,
        phase,
      });

      if (action === 'close_modal') {
        if (showHelpModal) setShowHelpModal(false);
        else if (showPrivacyModal) setShowPrivacyModal(false);
        else if (showSettingsModal) setShowSettingsModal(false);
        else if (showRateUsModal) setShowRateUsModal(false);
        else if (showLeaveMatchModal) {
          setShowLeaveMatchModal(false);
          document.body.dataset.state = 'playing';
          setPhase('playing');
        } else if (showBundleModal) setShowBundleModal(false);
        else if (showShopModal) setShowShopModal(false);
        else if (showJournalModal) setShowJournalModal(false);
        else if (showDailyStreakModal) setShowDailyStreakModal(false);
        return 'handled';
      }

      if (action === 'return_to_puzzle') {
        setShowFirstSofaPrompt(false);
        setAppView('puzzle');
        return 'handled';
      }

      if (action === 'prompt_leave_match') {
        document.body.dataset.state = 'paused';
        setPhase('paused');
        setShowLeaveMatchModal(true);
        return 'handled';
      }

      if (action === 'resume_paused') {
        document.body.dataset.state = 'playing';
        setPhase('playing');
        return 'handled';
      }

      return 'exit';
    });
  }, [
    showHelpModal,
    showPrivacyModal,
    showSettingsModal,
    showRateUsModal,
    showLeaveMatchModal,
    showBundleModal,
    showShopModal,
    showJournalModal,
    showDailyStreakModal,
    appView,
    phase,
  ]);

  const showBanner = useCallback((text: string, subtext?: string) => {
    setBanner({ id: Date.now() + Math.random(), text, subtext });
  }, []);

  const triggerGameOverState = useCallback(
    (finalScoreOverride?: number) => {
      triggerHaptic('warning');
      cozyAudio.playUiTick('gameover');
      const resolvedScore = finalScoreOverride ?? score;
      if (mode === 'duel' && isDailyPuzzleSeed(seedCode) && resolvedScore > 0) {
        const dailyOut = recordDailyPuzzleRun({
          seedCode,
          score: resolvedScore,
          completedDailyDates,
          dailyBestScore,
        });
        if (dailyOut.isDaily) {
          setCompletedDailyDates(dailyOut.nextCompletedDailyDates);
          setDailyBestScore(dailyOut.nextDailyBestScore);
          if (dailyOut.gemsEarned > 0) {
            setCozyGems((g) => g + dailyOut.gemsEarned);
            setGemsAwardedThisRun(dailyOut.gemsEarned);
          }
        }
      }
      if (mode === 'story' && !lossRecordedRef.current) {
        lossRecordedRef.current = true;
        setLevelLosses((prev) => ({
          ...prev,
          [levelNumber]: (prev[levelNumber] ?? 0) + 1,
        }));
      }
      if (fireflyStreak > 0) {
        setPreLossStreak(fireflyStreak);
        setFireflyStreak(0);
      } else {
        setPreLossStreak(0);
      }
      document.body.dataset.state = 'gameover';
      setPhase('gameover');
    },
    [
      mode,
      seedCode,
      score,
      completedDailyDates,
      dailyBestScore,
      levelNumber,
      fireflyStreak,
    ]
  );

  const startRun = useCallback(
    (targetMode: GameMode, targetLevel: number, customSeed?: string) => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }

      const nextSeed =
        targetMode === 'duel'
          ? normalizeSeedCode(customSeed ?? seedCode)
          : targetMode === 'story'
            ? `LV${targetLevel}-${generateSeedCode().slice(-2)}`
            : normalizeSeedCode(customSeed ?? generateSeedCode());

      const rng = mulberry32(hashSeedCode(nextSeed));
      rngRef.current = rng;

      const def =
        targetMode === 'story'
          ? getLevelDefinition(targetLevel)
          : targetMode === 'duel'
            ? createDuelDefinition(rng)
            : createZenDefinition();

      const ddaBoost =
        targetMode === 'story' && (levelLosses[targetLevel] ?? 0) >= 2;
      const freshGrid = buildGridFromLevel(
        def,
        rng,
        targetMode === 'story' ? fireflyStreak : 0
      );
      const freshTray =
        targetMode === 'story' && targetLevel === 1
          ? createLevel1OpeningTray()
          : targetMode === 'story' && targetLevel === 2
            ? createLevel2OpeningTray()
            : toTraySlots(
                generateSolvableTray(
                  freshGrid,
                  null,
                  1,
                  rng,
                  getTrayOptionsForLevel(def, ddaBoost)
                )
              );

      setMode(targetMode);
      setLevelNumber(targetLevel);
      setSeedCode(nextSeed);
      setGrid(freshGrid);
      setTray(freshTray);
      setPocket(null);
      setScore(0);
      setCombo(0);
      setBestCombo(0);
      setLinesCleared(0);
      setMovesPlaced(0);
      setMossCleared(0);
      setAcornGemsCollected(0);
      setBonusStarsEarned(0);
      setStarsAwardedThisRun(0);
      setGemsAwardedThisRun(0);
      setStarsDoubledThisRun(false);
      setSeedPackAwardedThisRun(false);
      setPreLossStreak(0);
      lossRecordedRef.current = false;
      setRotateCharges(1);
      setRotateGaugePct(0);
      setUndoCharges(1);
      setUndoStack([]);
      setClearingKeys(new Set());
      setParticleBursts([]);
      setTrayWaveId((w) => w + 1);
      setSelectedSource({ kind: 'tray', index: 0 });
      setHoverCell(null);
      setDragSession(null);
      setBanner(null);
      setAppView('puzzle');

      document.body.dataset.state = 'playing';
      setPhase('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    [seedCode, levelLosses, fireflyStreak]
  );

  const resumeSavedRun = useCallback(() => {
    setAppView('puzzle');
    document.body.dataset.state = 'playing';
    setPhase('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const computeBoardAnchor = useCallback(
    (piece: PieceInstance, clientX: number, clientY: number, pointerType: string) => {
      const boardEl = boardRef.current;
      if (!boardEl) return null;
      const rect = boardEl.getBoundingClientRect();
      const yOffset =
        pointerType === 'touch' ? TOUCH_THUMB_Y_OFFSET : MOUSE_LIFT_Y_OFFSET;

      const visualCenterX = clientX;
      const visualCenterY = clientY + yOffset;

      const margin = rect.width * 0.14;
      if (
        visualCenterX < rect.left - margin ||
        visualCenterX > rect.right + margin ||
        visualCenterY < rect.top - margin ||
        visualCenterY > rect.bottom + margin
      ) {
        return null;
      }

      const cellStep = rect.width / GRID_SIZE;
      const { rows, cols } = getShapeDimensions(piece.cells);
      const topLeftX = visualCenterX - (cols * cellStep) / 2;
      const topLeftY = visualCenterY - (rows * cellStep) / 2;

      const anchorCol = Math.round((topLeftX - rect.left) / cellStep);
      const anchorRow = Math.round((topLeftY - rect.top) / cellStep);

      return { anchorRow, anchorCol };
    },
    []
  );

  const checkIsOverPocket = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      const pocketEl = pocketRef.current;
      if (!pocketEl) return false;
      const rect = pocketEl.getBoundingClientRect();
      const yOffset = pointerType === 'touch' ? TOUCH_THUMB_Y_OFFSET * 0.4 : 0;
      const x = clientX;
      const y = clientY + yOffset;
      const pad = 12;
      return (
        x >= rect.left - pad &&
        x <= rect.right + pad &&
        y >= rect.top - pad &&
        y <= rect.bottom + pad
      );
    },
    []
  );

  const commitPlacement = useCallback(
    (source: PieceSource, piece: PieceInstance, anchorRow: number, anchorCol: number) => {
      const check = previewPlacement(grid, piece.cells, anchorRow, anchorCol);
      if (!check.valid) return false;

      const snapshot: UndoSnapshot = {
        grid: cloneGrid(grid),
        tray: tray.map((p) =>
          p
            ? {
                ...p,
                cells: p.cells.map((c) => ({ ...c })),
                acornCellIndices: p.acornCellIndices
                  ? [...p.acornCellIndices]
                  : undefined,
              }
            : null
        ),
        pocket: pocket
          ? {
              ...pocket,
              cells: pocket.cells.map((c) => ({ ...c })),
              acornCellIndices: pocket.acornCellIndices
                ? [...pocket.acornCellIndices]
                : undefined,
            }
          : null,
        score,
        combo,
        linesCleared,
        movesPlaced,
        mossCleared,
        acornGemsCollected,
        bonusStarsEarned,
        rotateCharges,
        rotateGaugePct,
        selectedSource,
      };

      const outcome = applyPlacement(
        grid,
        piece,
        anchorRow,
        anchorCol,
        combo,
        rotateGaugePct,
        rngRef.current
      );

      const nextScore = score + outcome.totalScoreGained;
      const nextBestScore = Math.max(bestScore, nextScore);
      const nextBestCombo = Math.max(bestCombo, outcome.nextCombo);
      const nextLines = linesCleared + outcome.totalClearedLines;
      const nextMoves = movesPlaced + 1;
      const nextMoss = mossCleared + outcome.mossCleared;
      const nextAcorns = acornGemsCollected + outcome.acornGemsCollected;
      const nextBonusStars = bonusStarsEarned + outcome.bonusFlowerStars;
      const nextRotateCharges = rotateCharges + outcome.earnedRotateCharges;

      if (mode === 'duel') {
        setDuelBestScore((prev) => Math.max(prev, nextScore));
      }

      let nextTray = tray.slice();
      let nextPocket = pocket;
      if (source.kind === 'tray') {
        nextTray[source.index] = null;
      } else {
        nextPocket = null;
      }

      const ddaBoost = mode === 'story' && (levelLosses[levelNumber] ?? 0) >= 2;
      const trayEmpty = nextTray.every((slot) => slot === null);
      if (trayEmpty) {
        nextTray = toTraySlots(
          generateSolvableTray(
            outcome.nextGrid,
            nextPocket,
            nextRotateCharges,
            rngRef.current,
            getTrayOptionsForLevel(activeLevelDef, ddaBoost)
          )
        );
        setTrayWaveId((w) => w + 1);
      }

      if (outcome.allClearedKeys.length > 0) {
        setClearingKeys(new Set(outcome.allClearedKeys));
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = window.setTimeout(() => {
          setClearingKeys(new Set());
        }, 260);

        // Build material-matched particle bursts (capped for 60fps mobile)
        const bursts: ClearedParticleBurst[] = [];
        const stamp = Date.now();
        for (const keyStr of outcome.allClearedKeys) {
          if (bursts.length >= 24) break;
          const [rStr, cStr] = keyStr.split('_');
          const br = Number(rStr);
          const bc = Number(cStr);
          const prevCell = grid[br]?.[bc];
          const mat: MaterialType = prevCell?.material ?? piece.material;
          const palette = MATERIAL_PARTICLE_COLORS[mat];
          bursts.push({
            id: `${stamp}_${keyStr}`,
            r: br,
            c: bc,
            colorHex: palette.colorHex,
            accentHex: palette.accentHex,
          });
        }
        setParticleBursts(bursts);
        if (particleTimerRef.current) window.clearTimeout(particleTimerRef.current);
        particleTimerRef.current = window.setTimeout(() => {
          setParticleBursts([]);
        }, 500);
      }

      if (
        settings.screenShakeEnabled &&
        (outcome.totalClearedLines >= 3 || outcome.cascadeCount > 0)
      ) {
        setBoardShakeKey((k) => k + 1);
      }

      // Haptics + Audio + Rich Feedback Banner
      triggerHaptic(
        outcome.cascadeCount > 0 || outcome.totalClearedLines >= 3
          ? 'heavy'
          : outcome.totalClearedLines > 0
            ? 'medium'
            : 'light'
      );
      cozyAudio.playPlace(piece.material);
      if (outcome.cascadeCount > 0) {
        cozyAudio.playCascade(
          outcome.cascadeCount,
          outcome.nextCombo,
          outcome.lanternDoubled
        );
      } else if (outcome.totalClearedLines > 0) {
        cozyAudio.playClear(
          outcome.totalClearedLines,
          outcome.nextCombo,
          outcome.lanternDoubled
        );
      }

      if (outcome.totalClearedLines > 0) {
        const parts: string[] = [];
        if (outcome.lanternDoubled) parts.push('Lantern 2×!');
        if (outcome.splashedCells.length > 0)
          parts.push(`Honey Splash +${outcome.splashedCells.length}`);
        if (outcome.cascadeBonusScore > 0)
          parts.push(`+${outcome.cascadeBonusScore} Cascade`);
        if (outcome.sproutedCells.length > 0) parts.push('Bloom Sprouted!');
        if (outcome.bonusFlowerStars > 0)
          parts.push(`+${outcome.bonusFlowerStars}★ Flower`);
        if (outcome.earnedRotateCharges > 0) parts.push('+1 Rotate');

        const mainLabel =
          outcome.cascadeCount > 0
            ? `CASCADE ×${outcome.cascadeCount + 1}! +${outcome.totalScoreGained}`
            : outcome.nextCombo >= 2
              ? `+${outcome.totalScoreGained} COMBO! (${outcome.nextCombo}×)`
              : outcome.totalClearedLines >= 2
                ? `+${outcome.totalScoreGained} · ${outcome.totalClearedLines}× CLEAR!`
                : `+${outcome.totalScoreGained} · Line Clear`;
        showBanner(mainLabel, parts.length > 0 ? parts.join(' · ') : undefined);
      }

      setUndoStack((prev) => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), snapshot]);
      setGrid(outcome.nextGrid);
      setTray(nextTray);
      setPocket(nextPocket);
      setScore(nextScore);
      setBestScore(nextBestScore);
      setCombo(outcome.nextCombo);
      setBestCombo(nextBestCombo);
      setLinesCleared(nextLines);
      setMovesPlaced(nextMoves);
      setMossCleared(nextMoss);
      setAcornGemsCollected(nextAcorns);
      setBonusStarsEarned(nextBonusStars);
      setRotateCharges(nextRotateCharges);
      setRotateGaugePct(outcome.nextRotateGaugePct);
      setHoverCell(null);
      setSelectedSource(getFirstAvailableSource(nextTray, nextPocket));
      setLifetimeStats((prev) => ({
        ...prev,
        totalBlocksPlaced: prev.totalBlocksPlaced + piece.cells.length,
        totalLinesCleared: prev.totalLinesCleared + outcome.totalClearedLines,
        highestComboEver: Math.max(prev.highestComboEver, outcome.nextCombo),
        totalAcornGems: prev.totalAcornGems + outcome.acornGemsCollected,
      }));

      // First-Session Payoff: Guided First Sofa after first double-clear in Level 1
      if (
        mode === 'story' &&
        levelNumber === 1 &&
        outcome.totalClearedLines >= 2 &&
        !haven.rooms.cottage_living?.sofa &&
        !firstSofaPromptDone
      ) {
        setShowFirstSofaPrompt(true);
      }

      // Check Story Mode Level Goal Victory!
      if (mode === 'story') {
        const goal = activeLevelDef.goal;
        const goalProgress =
          goal.type === 'score'
            ? nextScore
            : goal.type === 'acorn_gems'
              ? nextAcorns
              : nextMoss;

        if (goalProgress >= goal.target) {
          const diffMeta = getLevelDifficultyMeta(activeLevelDef);
          const earned = computeStarsForLevel(nextScore, activeLevelDef);
          const totalEarned = earned * diffMeta.starMultiplier + nextBonusStars;
          const gemDrop = computeStoryVictoryGemDrop(levelNumber, diffMeta.tier);
          const nextWinsCount = herbarium.storyWinsCount + 1;
          const earnedPack = shouldAwardSeedPack(nextWinsCount);

          setStarsAwardedThisRun(earned);
          setGemsAwardedThisRun(gemDrop);
          setCozyStars((s) => s + totalEarned);
          setCozyGems((g) => g + gemDrop);
          setUnlockedLevel((u) => Math.max(u, levelNumber + 1));
          const nextFireflyStreak = Math.min(5, fireflyStreak + 1);
          setFireflyStreak(nextFireflyStreak);
          setLevelLosses((prev) => ({ ...prev, [levelNumber]: 0 }));
          setLevelStars((prev) => ({
            ...prev,
            [levelNumber]: Math.max(prev[levelNumber] ?? 0, earned),
          }));
          setHerbarium((prev) => ({
            ...prev,
            storyWinsCount: nextWinsCount,
            seedPacks: prev.seedPacks + (earnedPack ? 1 : 0),
          }));
          setLifetimeStats((prev) => ({
            ...prev,
            totalStoryWins: prev.totalStoryWins + 1,
            bestFireflyStreak: Math.max(
              prev.bestFireflyStreak ?? 0,
              nextFireflyStreak
            ),
          }));
          setSeedPackAwardedThisRun(earnedPack);
          setPetCelebrating(true);
          triggerHaptic('success');
          cozyAudio.playVictory();
          document.body.dataset.state = 'gameover';
          setPhase('victory');
          return true;
        }
      }

      // Check Game Over
      const hasMove = checkHasAnyPlayableMove(
        outcome.nextGrid,
        nextTray,
        nextPocket,
        nextRotateCharges
      );
      if (!hasMove) {
        triggerGameOverState(nextScore);
      }

      return true;
    },
    [
      grid,
      tray,
      pocket,
      score,
      combo,
      linesCleared,
      movesPlaced,
      mossCleared,
      acornGemsCollected,
      bonusStarsEarned,
      rotateCharges,
      rotateGaugePct,
      selectedSource,
      bestScore,
      bestCombo,
      mode,
      activeLevelDef,
      levelNumber,
      levelLosses,
      haven.rooms.cottage_living?.sofa,
      firstSofaPromptDone,
      herbarium.storyWinsCount,
      fireflyStreak,
      settings.screenShakeEnabled,
      showBanner,
      triggerGameOverState,
    ]
  );

  const dismissTip = useCallback((tip: JitTipId) => {
    setDismissedTips((prev) => (prev.includes(tip) ? prev : [...prev, tip]));
  }, []);

  const handlePlaceFirstSofa = useCallback(
    (styleId: FurnitureStyleId) => {
      const result = applyFurnitureStyle(
        haven,
        Math.max(1, cozyStars),
        'cottage_living',
        'sofa',
        styleId
      );
      if (!result.success) return;
      setHaven(result.nextHaven);
      setCozyStars(result.nextStars);
      setFirstSofaPlacedStyle(styleId);
      setFirstSofaPromptDone(true);
      cozyAudio.playDecorate();
      triggerHaptic('success');
      showBanner(
        styleId === 'cottage_oak'
          ? 'Cottagecore Oak Sofa Placed!'
          : 'Minimalist Zen Sofa Placed!',
        'My Haven · Living Room'
      );
    },
    [haven, cozyStars, showBanner]
  );

  const handleSkipFirstSofa = useCallback(() => {
    setFirstSofaPromptDone(true);
    setShowFirstSofaPrompt(false);
  }, []);

  const handleStartDailyPuzzle = useCallback(() => {
    const dailySeed = getDailyPuzzleSeed();
    setSeedCode(dailySeed);
    startRun('duel', levelNumber, dailySeed);
  }, [levelNumber, startRun]);

  const moveTrayPieceToPocket = useCallback(
    (trayIndex: number) => {
      const incoming = tray[trayIndex];
      if (!incoming) return;

      let nextTray = tray.slice();
      const previousPocket = pocket;
      nextTray[trayIndex] = previousPocket;
      const nextPocket = incoming;

      const ddaBoost = mode === 'story' && (levelLosses[levelNumber] ?? 0) >= 2;
      if (nextTray.every((slot) => slot === null)) {
        nextTray = toTraySlots(
          generateSolvableTray(
            grid,
            nextPocket,
            rotateCharges,
            rngRef.current,
            getTrayOptionsForLevel(activeLevelDef, ddaBoost)
          )
        );
      }

      dismissTip('pocket');
      cozyAudio.playUiTick('pocket');
      triggerHaptic('light');
      setTray(nextTray);
      setPocket(nextPocket);
      setSelectedSource(
        previousPocket ? { kind: 'tray', index: trayIndex } : { kind: 'pocket' }
      );
      showBanner(
        previousPocket ? 'Swapped with Pocket' : 'Parked in Cozy Pocket',
        MATERIAL_META[incoming.material].label
      );

      const hasMove = checkHasAnyPlayableMove(
        grid,
        nextTray,
        nextPocket,
        rotateCharges
      );
      if (!hasMove) {
        triggerGameOverState();
      }
    },
    [
      tray,
      pocket,
      grid,
      rotateCharges,
      activeLevelDef,
      mode,
      levelNumber,
      levelLosses,
      dismissTip,
      showBanner,
      triggerGameOverState,
    ]
  );

  const handleRotateSelected = useCallback(() => {
    if (phase !== 'playing') return;
    if (rotateCharges <= 0) {
      showBanner('Need Rotate Charge', 'Clear 2+ lines or build a 2× combo');
      return;
    }

    const targetSource =
      selectedSource && getPieceAtSource(selectedSource, tray, pocket)
        ? selectedSource
        : getFirstAvailableSource(tray, pocket);

    if (!targetSource) return;
    const currentPiece = getPieceAtSource(targetSource, tray, pocket);
    if (!currentPiece) return;

    const rotated = rotatePieceCW(currentPiece, 1);

    if (targetSource.kind === 'tray') {
      setTray((prev) =>
        prev.map((item, idx) => (idx === targetSource.index ? rotated : item))
      );
    } else {
      setPocket(rotated);
    }

    dismissTip('rotate');
    setSelectedSource(targetSource);
    setRotateCharges((c) => Math.max(0, c - 1));
    cozyAudio.playUiTick('rotate');
  }, [phase, rotateCharges, selectedSource, tray, pocket, dismissTip, showBanner]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    if (undoCharges <= 0) {
      showBanner('No Undo Left', 'Tap Refill +1 to recharge');
      return;
    }

    const latest = undoStack[undoStack.length - 1];
    dismissTip('undo');
    setUndoStack((prev) => prev.slice(0, -1));
    setUndoCharges((c) => Math.max(0, c - 1));

    setGrid(latest.grid);
    setTray(latest.tray);
    setPocket(latest.pocket);
    setScore(latest.score);
    setCombo(latest.combo);
    setLinesCleared(latest.linesCleared);
    setMovesPlaced(latest.movesPlaced);
    setMossCleared(latest.mossCleared);
    setAcornGemsCollected(latest.acornGemsCollected);
    setBonusStarsEarned(latest.bonusStarsEarned);
    setRotateCharges(latest.rotateCharges);
    setRotateGaugePct(latest.rotateGaugePct);
    setSelectedSource(
      latest.selectedSource ?? getFirstAvailableSource(latest.tray, latest.pocket)
    );
    setHoverCell(null);
    dragSessionRef.current = null;
    pendingDragPointerRef.current = null;
    setDragSession(null);

    if (phase === 'gameover') {
      document.body.dataset.state = 'playing';
      setPhase('playing');
    }

    cozyAudio.playUiTick('undo');
    showBanner('Move Reverted', 'Tactical Undo used');
  }, [undoStack, undoCharges, phase, showBanner]);

  const handleRechargeUndo = useCallback(async () => {
    if (!monetization.noAdsBundlePurchased) {
      showBanner('Preparing rewarded ad…', 'Connecting to Google AdMob');
    }
    const res = await showRewardedAd('UNDO', {
      noAdsOwned: monetization.noAdsBundlePurchased,
    });
    if (!res.rewarded) {
      showBanner('Rewarded ad unavailable', res.message ?? 'Please try again later.');
      return;
    }
    setUndoCharges((c) => c + 1);
    cozyAudio.playRewardChime();
    showBanner('+1 Undo Rewarded', res.skippedAsVip ? 'VIP Ad-Free' : undefined);
  }, [monetization.noAdsBundlePurchased, showBanner]);

  const handleRewardRotate = useCallback(async () => {
    if (!monetization.noAdsBundlePurchased) {
      showBanner('Preparing rewarded ad…', 'Connecting to Google AdMob');
    }
    const res = await showRewardedAd('ROTATE', {
      noAdsOwned: monetization.noAdsBundlePurchased,
    });
    if (!res.rewarded) {
      showBanner('Rewarded ad unavailable', res.message ?? 'Please try again later.');
      return;
    }
    setRotateCharges((c) => c + 1);
    cozyAudio.playRewardChime();
    showBanner('+1 Rotate Rewarded', res.skippedAsVip ? 'VIP Ad-Free' : undefined);
  }, [monetization.noAdsBundlePurchased, showBanner]);

  const handleReviveClear3x3 = useCallback(async () => {
    if (!monetization.noAdsBundlePurchased) {
      showBanner('Preparing rewarded ad…', 'Loading the Garden Rescue reward');
    }
    const res = await showRewardedAd('REVIVE_CLEAR_3X3', {
      noAdsOwned: monetization.noAdsBundlePurchased,
    });
    if (!res.rewarded) {
      showBanner('Rewarded ad unavailable', res.message ?? 'Please try again later.');
      return;
    }

    const { nextGrid, clearedCells } = applyReviveClear3x3(grid);
    const bursts: ClearedParticleBurst[] = clearedCells.map((cell) => ({
      id: `revive_${Date.now()}_${cell.r}_${cell.c}`,
      r: cell.r,
      c: cell.c,
      colorHex: '#F59E0B',
      accentHex: '#FEF3C7',
    }));

    let nextTray = tray;
    const stillPlayable = checkHasAnyPlayableMove(
      nextGrid,
      nextTray,
      pocket,
      rotateCharges
    );
    if (!stillPlayable) {
      const ddaBoost = mode === 'story' && (levelLosses[levelNumber] ?? 0) >= 2;
      nextTray = toTraySlots(
        generateSolvableTray(
          nextGrid,
          pocket,
          rotateCharges,
          rngRef.current,
          getTrayOptionsForLevel(activeLevelDef, ddaBoost)
        )
      );
      setTrayWaveId((w) => w + 1);
    }

    if (preLossStreak > 0) {
      setFireflyStreak(preLossStreak);
      setPreLossStreak(0);
    }
    lossRecordedRef.current = false;

    setGrid(nextGrid);
    setTray(nextTray);
    setParticleBursts(bursts);
    if (particleTimerRef.current) window.clearTimeout(particleTimerRef.current);
    particleTimerRef.current = window.setTimeout(() => setParticleBursts([]), 520);
    if (settings.screenShakeEnabled) {
      setBoardShakeKey((k) => k + 1);
    }
    document.body.dataset.state = 'playing';
    setPhase('playing');
    triggerHaptic('success');
    cozyAudio.playRewardChime();
    showBanner(
      '3×3 Zone Cleared!',
      preLossStreak > 0
        ? `Revive Active · ${preLossStreak}/5 Streak Saved`
        : 'Revive Bonus Active'
    );
  }, [
    monetization.noAdsBundlePurchased,
    grid,
    tray,
    pocket,
    rotateCharges,
    activeLevelDef,
    mode,
    levelNumber,
    levelLosses,
    preLossStreak,
    settings.screenShakeEnabled,
    showBanner,
  ]);

  const handleDoubleVictoryStars = useCallback(async () => {
    if (starsDoubledThisRun) return;
    if (!monetization.noAdsBundlePurchased) {
      showBanner('Preparing rewarded ad…', 'Loading your double-stars reward');
    }
    const res = await showRewardedAd('DOUBLE_STARS', {
      noAdsOwned: monetization.noAdsBundlePurchased,
    });
    if (!res.rewarded) {
      showBanner('Rewarded ad unavailable', res.message ?? 'Please try again later.');
      return;
    }
    const diffMeta = getLevelDifficultyMeta(activeLevelDef);
    const extra = starsAwardedThisRun * diffMeta.starMultiplier + bonusStarsEarned;
    setCozyStars((s) => s + extra);
    setStarsDoubledThisRun(true);
    cozyAudio.playRewardChime();
    showBanner('Cozy Stars doubled!', res.skippedAsVip ? 'VIP Ad-Free' : 'Reward added');
  }, [
    starsDoubledThisRun,
    monetization.noAdsBundlePurchased,
    activeLevelDef,
    starsAwardedThisRun,
    bonusStarsEarned,
    showBanner,
  ]);

  const openShop = useCallback((tab: ShopTabId = 'bundles') => {
    setShopInitialTab(tab);
    setShowShopModal(true);
  }, []);

  const openJournal = useCallback((tab: JournalTabId = 'calendar') => {
    setJournalInitialTab(tab);
    setShowJournalModal(true);
  }, []);

  const milestoneContext: MilestoneProgressContext = useMemo(
    () => ({
      lifetimeStats,
      haven,
      herbarium,
      completedDailyDates,
      petBond,
      fireflyStreak,
    }),
    [lifetimeStats, haven, herbarium, completedDailyDates, petBond, fireflyStreak]
  );

  const claimableMilestonesCount = useMemo(
    () => countClaimableMilestones(milestoneContext, claimedMilestones),
    [milestoneContext, claimedMilestones]
  );

  const handleGivePetTreat = useCallback(() => {
    const res = giveDailyPetTreat(petBond);
    if (!res.given) {
      return {
        given: false,
        message: 'Already treated today — come back tomorrow!',
      };
    }
    setPetBond(res.nextBond);
    setCozyGems((g) => g + res.gemsEarned);
    if (res.bonusRotateCharges > 0) {
      setRotateCharges((r) => r + res.bonusRotateCharges);
    }
    cozyAudio.playPetReaction();
    cozyAudio.playRewardChime();
    triggerHaptic('success');
    const msg = res.leveledUp
      ? `Bond Level ${res.nextBond.level}! +${res.gemsEarned} Gems & +${res.bonusRotateCharges} Rotate!`
      : `Cozy treat given! +${res.gemsEarned} Gems`;
    showBanner(
      res.leveledUp ? `Pet Bond Lv ${res.nextBond.level}!` : 'Pet Treated!',
      msg
    );
    return { given: true, message: msg };
  }, [petBond, showBanner]);

  const handleClaimMilestone = useCallback(
    (milestoneId: string) => {
      const res = claimMilestoneReward(
        milestoneId,
        milestoneContext,
        claimedMilestones
      );
      if (!res.claimed) {
        return { ok: false, message: 'Milestone not ready to claim yet.' };
      }
      setClaimedMilestones(res.nextClaimedMilestones);
      if (res.gemsEarned > 0) {
        setCozyGems((g) => g + res.gemsEarned);
      }
      if (res.seedPacksEarned > 0) {
        setHerbarium((prev) => ({
          ...prev,
          seedPacks: prev.seedPacks + res.seedPacksEarned,
        }));
      }
      cozyAudio.playRewardChime();
      triggerHaptic('success');
      const parts = [`+${res.gemsEarned} Gems`];
      if (res.seedPacksEarned > 0) {
        parts.push(`+${res.seedPacksEarned} Seed Pack`);
      }
      return {
        ok: true,
        message: `${res.title} claimed! ${parts.join(' & ')}`,
      };
    },
    [milestoneContext, claimedMilestones]
  );

  const getShopSnapshot = useCallback(
    (): ShopAccountSnapshot => ({
      cozyGems,
      unlockedPremiumItems,
      activeTileSkin,
      activeWindowTheme,
      undoCharges,
      rotateCharges,
      monetization,
      haven,
      herbarium,
    }),
    [
      cozyGems,
      unlockedPremiumItems,
      activeTileSkin,
      activeWindowTheme,
      undoCharges,
      rotateCharges,
      monetization,
      haven,
      herbarium,
    ]
  );

  const applyShopSnapshot = useCallback((next: ShopAccountSnapshot) => {
    setCozyGems(next.cozyGems);
    setUnlockedPremiumItems(next.unlockedPremiumItems);
    setActiveTileSkin(next.activeTileSkin);
    setActiveWindowTheme(next.activeWindowTheme);
    setUndoCharges(next.undoCharges);
    setRotateCharges(next.rotateCharges);
    setMonetization(next.monetization);
    setHaven(next.haven);
    setHerbarium(next.herbarium);
  }, []);

  const handlePurchaseStoreProduct = useCallback(
    async (productId: StoreProductId) => {
      const storeResult = await purchaseStoreProduct(productId);
      if (!storeResult.success) {
        return { ok: false, message: storeResult.message };
      }
      const fulfilled = applyStoreProductFulfillment(getShopSnapshot(), productId);
      if (!fulfilled.applied) {
        return { ok: false, message: fulfilled.summary };
      }
      applyShopSnapshot(fulfilled.next);
      cozyAudio.playRewardChime();
      triggerHaptic('success');
      return { ok: true, message: fulfilled.summary };
    },
    [getShopSnapshot, applyShopSnapshot]
  );

  const handleWatchFreeGemsAd = useCallback(async () => {
    const res = await showRewardedAd('FREE_GEMS', {
      noAdsOwned: monetization.noAdsBundlePurchased,
    });
    if (!res.rewarded) {
      return {
        ok: false,
        message: res.message ?? 'The rewarded ad was not completed. No gems were added.',
      };
    }
    setCozyGems((g) => grantFreeAdGems(g, FREE_GEMS_AD_AMOUNT));
    cozyAudio.playRewardChime();
    triggerHaptic('success');
    return {
      ok: true,
      message: `+${FREE_GEMS_AD_AMOUNT} Cozy Gems added!`,
    };
  }, [monetization.noAdsBundlePurchased]);

  const handlePurchaseGemItem = useCallback(
    (itemId: GemShopItemId) => {
      const result = purchaseGemShopItem(getShopSnapshot(), itemId);
      if (!result.success) {
        return { ok: false, message: result.summary };
      }
      applyShopSnapshot(result.next);
      cozyAudio.playDecorate();
      triggerHaptic('success');
      return { ok: true, message: result.summary };
    },
    [getShopSnapshot, applyShopSnapshot]
  );

  const handleEquipCosmetic = useCallback(
    (kind: 'pet_lop_bunny' | 'theme_rainy_window' | 'skin_golden_lantern') => {
      if (kind === 'pet_lop_bunny') {
        if (!unlockedPremiumItems.includes('pet_lop_bunny')) return;
        setHaven((prev) => ({
          ...prev,
          activePet: prev.activePet === 'lop_bunny' ? 'ginger_cat' : 'lop_bunny',
        }));
        cozyAudio.playPetReaction();
      } else if (kind === 'theme_rainy_window') {
        if (!unlockedPremiumItems.includes('theme_rainy_window')) return;
        setActiveWindowTheme((prev) =>
          prev === 'rainy_conservatory' ? 'classic' : 'rainy_conservatory'
        );
        cozyAudio.playDecorate();
      } else if (kind === 'skin_golden_lantern') {
        if (!unlockedPremiumItems.includes('skin_golden_lantern')) return;
        setActiveTileSkin((prev) =>
          prev === 'golden_lantern' ? 'classic' : 'golden_lantern'
        );
        cozyAudio.playDecorate();
      }
    },
    [unlockedPremiumItems]
  );

  const handlePurchaseBundle = useCallback(() => {
    if (monetization.noAdsBundlePurchased) return;
    void handlePurchaseStoreProduct('bundle_cozy_starter_v1');
  }, [monetization.noAdsBundlePurchased, handlePurchaseStoreProduct]);

  const handleClaimDailyStreak = useCallback(() => {
    const result = claimDailyStreakReward(monetization);
    if (!result.claimed || !result.reward) return;
    const reward = result.reward;
    setMonetization(result.nextState);
    setCozyStars((s) => s + reward.stars);
    if (reward.undo > 0) setUndoCharges((u) => u + reward.undo);
    if (reward.rotate > 0) setRotateCharges((r) => r + reward.rotate);
    cozyAudio.playRewardChime();
  }, [monetization]);

  const handleGenerateBackupCode = useCallback(() => {
    const fallbackState = latestPayloadRef.current ?? loadPersistedState();
    return exportSaveBackupString(fallbackState);
  }, []);

  const handleRestoreBackupCode = useCallback((rawCode: string) => {
    const decoded = importSaveBackupString(rawCode);
    if (!decoded.ok) {
      return { ok: false, message: decoded.error };
    }
    const next = decoded.state;
    savePersistedState(next);
    latestPayloadRef.current = next;

    setBestScore(next.bestScore);
    setDuelBestScore(next.duelBestScore);
    setCozyStars(next.cozyStars);
    setCozyGems(next.cozyGems);
    setUnlockedPremiumItems(next.unlockedPremiumItems);
    setActiveTileSkin(next.activeTileSkin);
    setActiveWindowTheme(next.activeWindowTheme);
    setUnlockedLevel(next.unlockedLevel);
    setLevelNumber(next.currentLevel);
    setFireflyStreak(next.fireflyStreak);
    setLevelStars(next.levelStars);
    setLevelLosses(next.levelLosses);
    setNightCandleMode(next.nightCandleMode);
    setSettings(next.settings);
    setHaven(next.haven);
    setHerbarium(next.herbarium);
    setMonetization(next.monetization);
    setDismissedTips(next.dismissedTips ?? []);
    setFirstSofaPromptDone(Boolean(next.firstSofaPromptDone));
    setCompletedDailyDates(next.completedDailyDates ?? []);
    setDailyBestScore(next.dailyBestScore ?? 0);
    setPetBond(next.petBond ?? createDefaultPetBondState());
    setLifetimeStats(next.lifetimeStats ?? createDefaultLifetimeStats());
    setClaimedMilestones(next.claimedMilestones ?? []);
    setRewardedCompletedChapters(next.rewardedCompletedChapters ?? []);

    if (next.activeRun) {
      setMode(next.activeRun.mode);
      setSeedCode(next.activeRun.seedCode);
      setGrid(next.activeRun.grid);
      setTray(next.activeRun.tray);
      setPocket(next.activeRun.pocket);
      setScore(next.activeRun.score);
      setCombo(next.activeRun.combo);
      setBestCombo(next.activeRun.bestCombo);
      setLinesCleared(next.activeRun.linesCleared);
      setMovesPlaced(next.activeRun.movesPlaced);
      setMossCleared(next.activeRun.mossCleared);
      setAcornGemsCollected(next.activeRun.acornGemsCollected);
      setBonusStarsEarned(next.activeRun.bonusStarsEarned);
      setRotateCharges(next.activeRun.rotateCharges);
      setRotateGaugePct(next.activeRun.rotateGaugePct);
      setUndoCharges(next.activeRun.undoCharges);
      setUndoStack(next.activeRun.undoStack);
      rngRef.current = mulberry32(next.activeRun.rngState);
      setHasSavedRunFlag(next.activeRun.movesPlaced > 0);
    } else {
      setHasSavedRunFlag(false);
    }

    cozyAudio.playRewardChime();
    return {
      ok: true,
      message: `Progress restored! (${next.cozyStars} Cozy Stars · Level ${next.unlockedLevel})`,
    };
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    const res = await restorePlayStorePurchasesAsync(monetization);
    setMonetization(res.nextState);
    if (res.restoredProductIds && res.restoredProductIds.length > 0) {
      setUnlockedPremiumItems((prev) => {
        const nextSet = new Set(prev);
        if (res.restoredProductIds?.includes('bundle_cozy_starter_v1')) {
          nextSet.add('pet_lop_bunny');
        }
        if (res.restoredProductIds?.includes('bundle_master_artisan_v1')) {
          nextSet.add('theme_rainy_night');
        }
        return Array.from(nextSet);
      });
    }
    if (res.restoredNoAdsBundle || (res.restoredProductIds?.length ?? 0) > 0) {
      cozyAudio.playRewardChime();
    }
    return res.message;
  }, [monetization]);

  const handleResetAllData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access restrictions
    }
    const fresh = createDefaultPersistedState();
    setBestScore(fresh.bestScore);
    setDuelBestScore(fresh.duelBestScore);
    setCozyStars(fresh.cozyStars);
    setCozyGems(fresh.cozyGems);
    setUnlockedPremiumItems(fresh.unlockedPremiumItems);
    setActiveTileSkin(fresh.activeTileSkin);
    setActiveWindowTheme(fresh.activeWindowTheme);
    setUnlockedLevel(fresh.unlockedLevel);
    setLevelNumber(fresh.currentLevel);
    setFireflyStreak(fresh.fireflyStreak);
    setPreLossStreak(0);
    setLevelStars(fresh.levelStars);
    setLevelLosses(fresh.levelLosses);
    setNightCandleMode(fresh.nightCandleMode);
    setSettings(fresh.settings);
    setHaven(fresh.haven);
    setHerbarium(fresh.herbarium);
    setMonetization(fresh.monetization);
    setDismissedTips([]);
    setFirstSofaPromptDone(false);
    setCompletedDailyDates([]);
    setDailyBestScore(0);
    setPetBond(fresh.petBond ?? createDefaultPetBondState());
    setLifetimeStats(fresh.lifetimeStats ?? createDefaultLifetimeStats());
    setClaimedMilestones([]);
    setRewardedCompletedChapters([]);
    setMode('story');
    setSeedCode('HAVEN-84');
    const resetRng = mulberry32(hashSeedCode('HAVEN-84'));
    rngRef.current = resetRng;
    setGrid(buildGridFromLevel(getLevelDefinition(1), resetRng, 0));
    setTray(createLevel1OpeningTray());
    setPocket(null);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLinesCleared(0);
    setMovesPlaced(0);
    setMossCleared(0);
    setAcornGemsCollected(0);
    setBonusStarsEarned(0);
    setRotateCharges(1);
    setRotateGaugePct(0);
    setUndoCharges(1);
    setUndoStack([]);
    setSelectedSource(null);
    setHasSavedRunFlag(false);
    setShowFirstSofaPrompt(false);
    setFirstSofaPlacedStyle(null);
    setShowSettingsModal(false);
    setAppView('puzzle');
    setPhase('title');
    cozyAudio.playUiTick('undo');
  }, []);

  const handleRequestAdConsent = useCallback(async () => {
    const res = await requestAdConsent();
    setMonetization((prev) => ({
      ...prev,
      adConsentStatus: res.consentObtained ? 'obtained' : 'unknown',
    }));
    if (res.error) {
      return res.error.includes('available in the installed Android app')
        ? res.error
        : 'Ad privacy could not be refreshed. Ads remain disabled. Check your connection and retry.';
    }
    if (res.canRequestAds) {
      return 'Ad privacy choices checked. Google permits ad requests.';
    }
    return isNativePlatform()
      ? 'Ad consent is not available yet. Ads remain disabled.'
      : 'Ad privacy controls are available in the installed Android app.';
  }, []);

  // Keep callback refs fresh without re-registering window listeners on
  // every drag coordinate update.
  const dragActionsRef = useRef({
    checkIsOverPocket,
    computeBoardAnchor,
    commitPlacement,
    moveTrayPieceToPocket,
  });
  dragActionsRef.current = {
    checkIsOverPocket,
    computeBoardAnchor,
    commitPlacement,
    moveTrayPieceToPocket,
  };

  // Global Pointer listeners are registered once. Pointermove events are
  // coalesced to one state update per animation frame, avoiding listener churn
  // and repeated React renders on high-rate touchscreens.
  useEffect(() => {
    const clearPendingDragFrame = () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      pendingDragPointerRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const active = dragSessionRef.current;
      if (!active || e.pointerId !== active.pointerId) return;

      pendingDragPointerRef.current = {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      if (dragFrameRef.current !== null) return;

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const point = pendingDragPointerRef.current;
        const current = dragSessionRef.current;
        if (!point || !current || point.pointerId !== current.pointerId) return;

        const moved =
          current.hasMoved ||
          Math.hypot(
            point.clientX - current.startX,
            point.clientY - current.startY
          ) > 6;
        const next: DragSession = {
          ...current,
          clientX: point.clientX,
          clientY: point.clientY,
          hasMoved: moved,
        };
        dragSessionRef.current = next;
        setDragSession(next);

        if (moved && current.source.kind === 'tray') {
          setIsOverPocket(
            dragActionsRef.current.checkIsOverPocket(
              point.clientX,
              point.clientY,
              current.pointerType
            )
          );
        } else {
          setIsOverPocket(false);
        }
      });
    };

    const handlePointerEnd = (e: PointerEvent) => {
      const current = dragSessionRef.current;
      if (!current || e.pointerId !== current.pointerId) return;
      clearPendingDragFrame();

      const moved =
        current.hasMoved ||
        Math.hypot(e.clientX - current.startX, e.clientY - current.startY) > 6;

      if (!moved) {
        setSelectedSource(current.source);
      } else {
        const actions = dragActionsRef.current;
        const overPocket =
          current.source.kind === 'tray' &&
          actions.checkIsOverPocket(e.clientX, e.clientY, current.pointerType);

        if (overPocket && current.source.kind === 'tray') {
          actions.moveTrayPieceToPocket(current.source.index);
        } else {
          const anchor = actions.computeBoardAnchor(
            current.piece,
            e.clientX,
            e.clientY,
            current.pointerType
          );
          if (anchor) {
            actions.commitPlacement(
              current.source,
              current.piece,
              anchor.anchorRow,
              anchor.anchorCol
            );
          }
        }
      }

      dragSessionRef.current = null;
      setDragSession(null);
      setIsOverPocket(false);
    };

    const handleWindowBlur = () => {
      clearPendingDragFrame();
      dragSessionRef.current = null;
      setDragSession(null);
      setIsOverPocket(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      clearPendingDragFrame();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (showHelpModal) {
          e.preventDefault();
          setShowHelpModal(false);
          return;
        }
        if (showPrivacyModal) {
          e.preventDefault();
          setShowPrivacyModal(false);
          return;
        }
        if (showSettingsModal) {
          e.preventDefault();
          setShowSettingsModal(false);
          return;
        }
        if (showRateUsModal) {
          e.preventDefault();
          setShowRateUsModal(false);
          return;
        }
        if (showLeaveMatchModal) {
          e.preventDefault();
          setShowLeaveMatchModal(false);
          document.body.dataset.state = 'playing';
          setPhase('playing');
          return;
        }
        if (showBundleModal) {
          e.preventDefault();
          setShowBundleModal(false);
          return;
        }
        if (showShopModal) {
          e.preventDefault();
          setShowShopModal(false);
          return;
        }
        if (showJournalModal) {
          e.preventDefault();
          setShowJournalModal(false);
          return;
        }
        if (showDailyStreakModal) {
          e.preventDefault();
          setShowDailyStreakModal(false);
          return;
        }
      }

      if (phase === 'title') {
        if (
          (e.key === 'Enter' || e.key === ' ') &&
          !showBundleModal &&
          !showShopModal &&
          !showJournalModal &&
          !showDailyStreakModal &&
          !showSettingsModal &&
          !showPrivacyModal &&
          !showHelpModal
        ) {
          e.preventDefault();
          if (hasSavedRunFlag) resumeSavedRun();
          else startRun(mode, levelNumber, seedCode);
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (phase === 'playing') {
          e.preventDefault();
          document.body.dataset.state = 'paused';
          setPhase('paused');
        } else if (phase === 'paused') {
          e.preventDefault();
          document.body.dataset.state = 'playing';
          setPhase('playing');
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        return;
      }

      if (phase !== 'playing' || appView !== 'puzzle') return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateSelected();
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        const idx = Number(e.key) - 1;
        if (tray[idx]) setSelectedSource({ kind: 'tray', index: idx });
      } else if (e.key === 'h' || e.key === 'H') {
        if (pocket) {
          setSelectedSource({ kind: 'pocket' });
        } else if (selectedSource?.kind === 'tray') {
          moveTrayPieceToPocket(selectedSource.index);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    appView,
    showBundleModal,
    showShopModal,
    showJournalModal,
    showDailyStreakModal,
    showSettingsModal,
    showPrivacyModal,
    showRateUsModal,
    showLeaveMatchModal,
    showHelpModal,
    hasSavedRunFlag,
    resumeSavedRun,
    startRun,
    mode,
    levelNumber,
    seedCode,
    handleRotateSelected,
    handleUndo,
    toggleMute,
    tray,
    pocket,
    selectedSource,
    moveTrayPieceToPocket,
  ]);

  const activePreview: PlacementPreview | null = useMemo(() => {
    if (dragSession && dragSession.hasMoved && !isOverPocket) {
      const anchor = computeBoardAnchor(
        dragSession.piece,
        dragSession.clientX,
        dragSession.clientY,
        dragSession.pointerType
      );
      if (!anchor) return null;
      return previewPlacement(
        grid,
        dragSession.piece.cells,
        anchor.anchorRow,
        anchor.anchorCol
      );
    }

    if (hoverCell && selectedSource) {
      const piece = getPieceAtSource(selectedSource, tray, pocket);
      if (!piece) return null;
      return previewPlacement(grid, piece.cells, hoverCell.r, hoverCell.c);
    }

    return null;
  }, [
    dragSession,
    isOverPocket,
    computeBoardAnchor,
    grid,
    hoverCell,
    selectedSource,
    tray,
    pocket,
  ]);

  const previewPiece = useMemo(() => {
    if (dragSession?.hasMoved) return dragSession.piece;
    return getPieceAtSource(selectedSource, tray, pocket);
  }, [dragSession, selectedSource, tray, pocket]);

  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragSession || e.pointerType === 'touch' || !selectedSource) return;
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      const col = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
      const row = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        setHoverCell((prev) =>
          prev && prev.r === row && prev.c === col ? prev : { r: row, c: col }
        );
      }
    },
    [dragSession, selectedSource]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing' || !selectedSource) return;
      const piece = getPieceAtSource(selectedSource, tray, pocket);
      if (!piece) return;
      commitPlacement(selectedSource, piece, row, col);
    },
    [phase, selectedSource, tray, pocket, commitPlacement]
  );

  const handlePocketClick = useCallback(() => {
    if (phase !== 'playing') return;
    if (selectedSource?.kind === 'tray' && tray[selectedSource.index]) {
      moveTrayPieceToPocket(selectedSource.index);
    } else if (pocket) {
      setSelectedSource({ kind: 'pocket' });
    }
  }, [phase, selectedSource, tray, pocket, moveTrayPieceToPocket]);

  const startPieceDrag = useCallback(
    (e: React.PointerEvent, source: PieceSource, piece: PieceInstance) => {
      if (phase !== 'playing') return;
      e.preventDefault();
      triggerHaptic('light');
      cozyAudio.playPickup(piece.material);
      const nextDragSession: DragSession = {
        source,
        piece,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
        hasMoved: false,
      };
      dragSessionRef.current = nextDragSession;
      pendingDragPointerRef.current = null;
      setDragSession(nextDragSession);
    },
    [phase]
  );

  const nativeRuntime = isNativePlatform();

  if (phase === 'title') {
    const savedLabel =
      mode === 'story'
        ? `Lv ${levelNumber} · ${score.toLocaleString()}`
        : mode === 'duel'
          ? `Duel · ${score.toLocaleString()}`
          : `Zen · ${score.toLocaleString()}`;

    return (
      <>
        <TitleScreen
          selectedMode={mode}
          selectedLevel={levelNumber}
          unlockedLevel={unlockedLevel}
          cozyStars={cozyStars}
          cozyGems={cozyGems}
          fireflyStreak={fireflyStreak}
          levelStars={levelStars}
          bestScore={bestScore}
          duelBestScore={duelBestScore}
          hasSavedRun={hasSavedRunFlag}
          savedRunLabel={savedLabel}
          nightCandleMode={nightCandleMode}
          seedCode={seedCode}
          dailyStreakAvailable={canClaimDailyStreak(monetization)}
          dailyCompletedToday={completedDailyDates.includes(getTodayDateKey())}
          dailyBestScore={dailyBestScore}
          claimableMilestonesCount={claimableMilestonesCount}
          noAdsOwned={monetization.noAdsBundlePurchased}
          onSelectMode={setMode}
          onSelectLevel={setLevelNumber}
          onToggleTheme={() => setNightCandleMode((v) => !v)}
          onSeedChange={setSeedCode}
          onResumeRun={resumeSavedRun}
          onStartNewRun={() => startRun(mode, levelNumber, seedCode)}
          onStartDailyPuzzle={handleStartDailyPuzzle}
          onOpenHaven={() => {
            if (!hasSavedRunFlag) {
              startRun(mode, levelNumber, seedCode);
            }
            setAppView('haven');
            document.body.dataset.state = 'playing';
            setPhase('playing');
          }}
          onOpenShop={openShop}
          onOpenJournal={openJournal}
          onOpenDailyStreak={() => setShowDailyStreakModal(true)}
          onOpenBundle={() => setShowBundleModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenPrivacyTerms={() => setShowPrivacyModal(true)}
        />
        {showJournalModal && (
          <JournalModal
            initialTab={journalInitialTab}
            context={milestoneContext}
            claimedMilestones={claimedMilestones}
            dailyBestScore={dailyBestScore}
            onClaimMilestone={handleClaimMilestone}
            onPlayDailyToday={() => {
              setShowJournalModal(false);
              handleStartDailyPuzzle();
            }}
            onClose={() => setShowJournalModal(false)}
          />
        )}
        {showDailyStreakModal && (
          <DailyStreakModal
            monetization={monetization}
            onClaim={handleClaimDailyStreak}
            onClose={() => setShowDailyStreakModal(false)}
          />
        )}
        {showBundleModal && (
          <StarterBundleModal
            purchased={monetization.noAdsBundlePurchased}
            onPurchase={handlePurchaseBundle}
            onClose={() => setShowBundleModal(false)}
          />
        )}
        {showShopModal && (
          <ShopModal
            initialTab={shopInitialTab}
            cozyGems={cozyGems}
            noAdsOwned={monetization.noAdsBundlePurchased}
            unlockedPremiumItems={unlockedPremiumItems}
            activePet={haven.activePet}
            activeTileSkin={activeTileSkin}
            activeWindowTheme={activeWindowTheme}
            onPurchaseStoreProduct={handlePurchaseStoreProduct}
            onWatchFreeGemsAd={handleWatchFreeGemsAd}
            onPurchaseGemItem={handlePurchaseGemItem}
            onEquipCosmetic={handleEquipCosmetic}
            onClose={() => setShowShopModal(false)}
          />
        )}
        {showSettingsModal && (
          <SettingsModal
            settings={settings}
            adConsentStatus={monetization.adConsentStatus}
            noAdsOwned={monetization.noAdsBundlePurchased}
            onUpdateSettings={updateSettings}
            onGenerateBackupCode={handleGenerateBackupCode}
            onRestoreBackupCode={handleRestoreBackupCode}
            onRestorePurchases={handleRestorePurchases}
            onRequestAdConsent={handleRequestAdConsent}
            onOpenPrivacyTerms={() => setShowPrivacyModal(true)}
            onResetAllData={handleResetAllData}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
        {showPrivacyModal && (
          <PrivacyTermsModal onClose={() => setShowPrivacyModal(false)} />
        )}
      </>
    );
  }

  const selectedPiece = getPieceAtSource(selectedSource, tray, pocket);
  const canSwapOrPark =
    selectedSource?.kind === 'tray' && Boolean(tray[selectedSource.index]);

  const boardCellPx =
    boardRef.current && boardRef.current.clientWidth > 0
      ? Math.floor((boardRef.current.clientWidth - 24) / GRID_SIZE)
      : 40;

  // Contextual Just-In-Time (JIT) Tooltip selection (never shown upfront on move 0, never re-shown once dismissed)
  const activeJitTip: {
    id: JitTipId;
    title: string;
    body: string;
  } | null = (() => {
    if (phase !== 'playing' || appView !== 'puzzle' || showFirstSofaPrompt) {
      return null;
    }
    if (
      movesPlaced >= 1 &&
      !dismissedTips.includes('rotate') &&
      rotateCharges > 0 &&
      selectedPiece &&
      selectedPiece.cells.length > 1
    ) {
      return {
        id: 'rotate',
        title: 'Tip · Spin Pieces',
        body: 'Tap Spin (or R) to rotate your selected block 90° clockwise.',
      };
    }
    if (
      movesPlaced >= 2 &&
      !dismissedTips.includes('pocket') &&
      pocket === null
    ) {
      return {
        id: 'pocket',
        title: 'Tip · Cozy Pocket Reserve',
        body: 'Tap or drag a block into Pocket to hold it for a better turn.',
      };
    }
    if (
      movesPlaced >= 3 &&
      !dismissedTips.includes('undo') &&
      undoStack.length > 0 &&
      undoCharges > 0
    ) {
      return {
        id: 'undo',
        title: 'Tip · Tactical Undo',
        body: 'Made a misstep? Tap Undo (or Z) to rewind your last placement.',
      };
    }
    return null;
  })();

  // Goal progress metrics
  const goal = activeLevelDef.goal;
  const currentGoalVal =
    goal.type === 'score'
      ? score
      : goal.type === 'acorn_gems'
        ? acornGemsCollected
        : mossCleared;
  const goalPct = Math.min(100, Math.round((currentGoalVal / goal.target) * 100));

  const activeDiffMeta = getLevelDifficultyMeta(activeLevelDef);
  const runStats: RunStats = {
    mode,
    levelNumber,
    levelTitle: activeLevelDef.title,
    boardShape: activeLevelDef.boardShape,
    difficultyTier: activeDiffMeta.tier,
    starMultiplier: activeDiffMeta.starMultiplier,
    score,
    bestScore: mode === 'duel' ? duelBestScore : bestScore,
    linesCleared,
    movesPlaced,
    bestCombo,
    mossCleared,
    acornGemsCollected,
    bonusStarsEarned,
    starsAwarded: starsAwardedThisRun,
    gemsAwarded: gemsAwardedThisRun,
    seedCode,
    goal,
  };

  const puzzleAmbience: HavenChapterId =
    haven.activeChapter === 'rainy_conservatory' ||
    activeWindowTheme === 'rainy_conservatory'
      ? 'rainy_conservatory'
      : haven.activeChapter === 'zen_garden'
        ? 'zen_garden'
        : 'cottage_living';

  const ambienceBgClass =
    puzzleAmbience === 'rainy_conservatory'
      ? 'bg-[#EEF3F2] dark:bg-[#080C10]'
      : puzzleAmbience === 'zen_garden'
        ? 'bg-[#F2F3EA] dark:bg-[#090B08]'
        : 'bg-[#F6EFE4] dark:bg-[#080705]';

  return (
    <div
      data-puzzle-ambience={puzzleAmbience}
      className={`safe-area-shell min-h-dvh w-full overflow-x-hidden flex flex-col justify-between select-none text-[#2A1F15] dark:text-[#F5EDE1] transition-colors duration-300 ${ambienceBgClass}`}
    >
      {/* Compact Top HUD */}
      <header className="w-full max-w-5xl mx-auto px-2.5 sm:px-6 pt-2 sm:pt-3.5 pb-1 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <div className="order-1 flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => {
              document.body.dataset.state = 'paused';
              setPhase('paused');
            }}
            aria-label="Pause game"
            className="min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] shrink-0 flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
          >
            <Pause className="w-4 h-4" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-sm sm:text-base font-bold leading-tight text-[#1E3A2F] dark:text-amber-200 truncate">
              {appView === 'haven'
                ? 'My Cozy Haven'
                : mode === 'story'
                  ? `Lv ${levelNumber} · ${activeLevelDef.title}`
                  : mode === 'duel'
                    ? isDailyPuzzleSeed(seedCode)
                      ? `Daily · ${seedCode.replace(/^DAILY-/, '')}`
                      : `Duel · ${seedCode}`
                    : 'Endless Zen'}
            </span>
            <span className="text-[11px] text-[#7A654F] dark:text-[#A4907B] truncate">
              {appView === 'haven'
                ? 'Spend Cozy Stars to decorate'
                : activeDiffMeta.badgeLabel
                  ? `${BOARD_SHAPE_META[activeLevelDef.boardShape].name} · ${activeDiffMeta.badgeLabel}`
                  : BOARD_SHAPE_META[activeLevelDef.boardShape].name}
            </span>
          </div>
        </div>

        {/* Score / Combo / Stars / Gem Shop Badge */}
        <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#7A654F] dark:text-[#A4907B]">
              Score
            </div>
            <div
              data-testid="score-value"
              className="font-mono-num text-sm sm:text-xl font-bold leading-tight text-[#1E3A2F] dark:text-amber-300"
            >
              {score.toLocaleString()}
            </div>
          </div>

          {combo >= 2 && appView === 'puzzle' && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
              <Flame className="w-3.5 h-3.5" />
              <span className="font-mono-num text-xs font-bold">{combo}×</span>
            </div>
          )}

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#7A654F] dark:text-[#A4907B]">
              Stars
            </div>
            <div
              data-testid="best-score-value"
              className="font-mono-num text-xs sm:text-base font-semibold leading-tight text-[#4D3B2A] dark:text-[#E2D3C0] inline-flex items-center gap-0.5 sm:gap-1"
            >
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-400" />
              <span>{cozyStars}</span>
            </div>
          </div>

          <button
            type="button"
            data-testid="hud-gem-badge"
            onClick={() => openShop('bundles')}
            aria-label={`Open Cozy Shop (${cozyGems} Cozy Gems)`}
            className="inline-flex items-center gap-1 min-h-[36px] sm:min-h-[40px] px-2 sm:px-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap shrink-0
              bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100
              dark:bg-[#151D26] dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-[#1D2835]"
          >
            <Gem className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
            <span className="font-mono-num">{cozyGems.toLocaleString()}</span>
            <Plus className="w-3 h-3 text-sky-700 dark:text-sky-300" />
          </button>
        </div>

        {/* Seamless Puzzle / My Haven Tab Switch + Lantern Streak + Utility Toggles */}
        <div className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <div
              role="tablist"
              aria-label="Workspace view"
              className="inline-flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-xl border bg-[#E7D8C0] border-[#D4C0A3] dark:bg-[#15100C] dark:border-[#33251B] shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={appView === 'puzzle'}
                data-testid="tab-puzzle"
                onClick={() => setAppView('puzzle')}
                className={`inline-flex items-center justify-center gap-1 min-h-[28px] sm:min-h-[36px] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                  appView === 'puzzle'
                    ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08] shadow-sm'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Puzzle</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={appView === 'haven'}
                data-testid="tab-haven"
                onClick={() => setAppView('haven')}
                className={`inline-flex items-center justify-center gap-1 min-h-[28px] sm:min-h-[36px] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                  appView === 'haven'
                    ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08] shadow-sm'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Haven</span>
              </button>
            </div>

            {appView === 'puzzle' && (
              <div
                data-testid="firefly-streak-tracker"
                aria-label={`Firefly Lantern Win-Streak ${fireflyStreak} of 5`}
                className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D] shrink-0"
              >
                <span
                  aria-hidden="true"
                  className={`sm:hidden w-1.5 h-2.5 rounded-[2px] border ${
                    fireflyStreak > 0
                      ? 'bg-amber-400 border-amber-600 shadow-[0_0_6px_rgba(251,191,36,0.75)]'
                      : 'bg-[#DFCEB2] border-[#BFA886] dark:bg-[#241B14] dark:border-[#3D2E22]'
                  }`}
                />
                <div className="hidden sm:flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const lit = idx < fireflyStreak;
                    return (
                      <span
                        key={idx}
                        data-testid={`firefly-lantern-${idx}`}
                        data-lit={lit ? 'true' : 'false'}
                        className={`w-2.5 h-3.5 rounded-[4px] border transition-colors ${
                          lit
                            ? 'bg-amber-400 border-amber-600 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                            : 'bg-[#DFCEB2] border-[#BFA886] dark:bg-[#241B14] dark:border-[#3D2E22]'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="font-mono-num text-[10px] sm:text-[11px] font-bold text-[#6E5A46] dark:text-amber-300">
                  {fireflyStreak}/5
                </span>
              </div>
            )}
          </div>

          <div className="flex sm:hidden items-center gap-1 shrink-0">
            {unlockedLevel >= 2 && nativeRuntime && (
              <button
                type="button"
                data-testid="hud-bundle-button-mobile"
                onClick={() => setShowBundleModal(true)}
                aria-label="Open No Ads Cozy Starter Bundle"
                className="min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                  bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E5D4BA]
                  dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              data-testid="hud-journal-btn-mobile"
              onClick={() => openJournal('calendar')}
              aria-label="Open Cozy Journal"
              className="relative min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
            >
              <Trophy className="w-3.5 h-3.5" />
              {claimableMilestonesCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                />
              )}
            </button>
            <button
              type="button"
              data-testid="hud-help-btn-mobile"
              onClick={() => setShowHelpModal(true)}
              aria-label="How to play"
              className="min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setNightCandleMode((v) => !v)}
              aria-label={
                nightCandleMode
                  ? 'Switch to Warm Daylight mode'
                  : 'Switch to OLED Candlelight Night mode'
              }
              className="min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              {nightCandleMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-amber-700" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              aria-label="Open player settings"
              className="min-h-[30px] min-w-[28px] flex items-center justify-center rounded-lg border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Desktop Utility Buttons */}
        <div className="hidden sm:flex order-4 items-center gap-1.5 shrink-0">
          {unlockedLevel >= 2 && nativeRuntime && (
            <button
              type="button"
              data-testid="hud-bundle-button"
              onClick={() => setShowBundleModal(true)}
              aria-label="Open No Ads Cozy Starter Bundle"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
                bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E5D4BA]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            data-testid="hud-journal-btn"
            onClick={() => openJournal('calendar')}
            aria-label="Open Cozy Journal"
            className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
          >
            <Trophy className="w-4 h-4" />
            {claimableMilestonesCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500"
              />
            )}
          </button>
          <button
            type="button"
            data-testid="hud-help-btn"
            onClick={() => setShowHelpModal(true)}
            aria-label="How to play"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setNightCandleMode((v) => !v)}
            aria-label={
              nightCandleMode
                ? 'Switch to Warm Daylight mode'
                : 'Switch to OLED Candlelight Night mode'
            }
            data-testid="theme-toggle"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
          >
            {nightCandleMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-amber-700" />
            )}
          </button>
          <button
            type="button"
            data-testid="mute-toggle"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            )}
          </button>
          <button
            type="button"
            data-testid="hud-settings-btn"
            onClick={() => setShowSettingsModal(true)}
            aria-label="Open player settings"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors
              bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Play or Haven Workspace */}
      {appView === 'haven' ? (
        <main className="flex-1 w-full flex flex-col justify-center pb-3">
          {showFirstSofaPrompt && (
            <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 mb-2">
              <div
                data-testid="haven-first-sofa-banner"
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl border bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/35 dark:border-emerald-500/40 dark:text-emerald-200"
              >
                <div className="text-xs sm:text-sm font-semibold">
                  {haven.rooms.cottage_living?.sofa
                    ? 'Your new Living Room Sofa is placed! Ready to continue Level 1?'
                    : 'Spend 1 starter Cozy Star to place your first Living Room Sofa:'}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!haven.rooms.cottage_living?.sofa && (
                    <>
                      <button
                        type="button"
                        data-testid="haven-first-sofa-cottage_oak"
                        onClick={() => handlePlaceFirstSofa('cottage_oak')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08]"
                      >
                        Cottagecore Oak (1 ★)
                      </button>
                      <button
                        type="button"
                        data-testid="haven-first-sofa-minimalist_zen"
                        onClick={() => handlePlaceFirstSofa('minimalist_zen')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-600/40 bg-white/80 text-emerald-950 hover:bg-white dark:bg-[#191410] dark:text-amber-200"
                      >
                        Minimalist Zen (1 ★)
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    data-testid="first-sofa-return-board-btn"
                    onClick={() => {
                      setShowFirstSofaPrompt(false);
                      setAppView('puzzle');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08]"
                  >
                    Return to Active Board
                  </button>
                </div>
              </div>
            </div>
          )}
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-sm font-medium text-[#7A654F] dark:text-[#A4907B]">
                Opening My Cozy Haven...
              </div>
            }
          >
            <HavenRoom
              haven={haven}
              herbarium={herbarium}
              petBond={petBond}
              cozyStars={cozyStars}
              unlockedLevel={unlockedLevel}
              bestScore={bestScore}
              fireflyStreak={fireflyStreak}
              nightCandleMode={nightCandleMode}
              petCelebrating={petCelebrating}
              unlockedPremiumItems={unlockedPremiumItems}
              activeWindowTheme={activeWindowTheme}
              claimableMilestonesCount={claimableMilestonesCount}
              seedCode={seedCode}
              onUpdateHaven={(nextHaven, nextStars) => {
                setHaven(nextHaven);
                setCozyStars(nextStars);
                const ch = nextHaven.activeChapter;
                const chComp = getRoomCompletion(nextHaven, ch);
                if (
                  chComp.unlocked >= chComp.total &&
                  !rewardedCompletedChapters.includes(ch)
                ) {
                  setRewardedCompletedChapters((prev) =>
                    prev.includes(ch) ? prev : [...prev, ch]
                  );
                  setCozyGems((g) => g + ROOM_COMPLETION_BONUS_GEMS);
                  cozyAudio.playVictory();
                  triggerHaptic('success');
                  showBanner(
                    `${HAVEN_CHAPTER_META[ch].title} Restored!`,
                    `+${ROOM_COMPLETION_BONUS_GEMS} Bonus Cozy Gems!`
                  );
                }
                const unlockedFurnitureCount = countUnlockedFurniture(nextHaven);
                if (
                  shouldTriggerSmartStarterOffer(
                    unlockedFurnitureCount,
                    monetization,
                    { unlockedLevel, nativeOnly: true }
                  )
                ) {
                  setMonetization((prev) => ({
                    ...prev,
                    starterOfferShown: true,
                  }));
                  setShowBundleModal(true);
                } else if (
                  shouldTriggerRateUsPrompt(
                    unlockedFurnitureCount,
                    monetization,
                    'haven_upgrade',
                    { unlockedLevel, nativeOnly: true }
                  )
                ) {
                  setMonetization((prev) => ({
                    ...prev,
                    ratingPromptShown: true,
                  }));
                  setShowRateUsModal(true);
                }
              }}
              onUpdateHerbarium={setHerbarium}
              onGivePetTreat={handleGivePetTreat}
              onOpenShop={openShop}
              onOpenJournal={openJournal}
              onBackToPuzzle={() => {
                setShowFirstSofaPrompt(false);
                setAppView('puzzle');
              }}
              onClearPetCelebration={() => setPetCelebrating(false)}
            />
          </React.Suspense>
        </main>
      ) : (
      <main className="flex-1 w-full max-w-5xl mx-auto px-2.5 sm:px-6 py-0.5 sm:py-2 flex flex-col lg:flex-row items-center justify-center gap-1.5 sm:gap-4 lg:gap-8">
        {/* Board Column */}
        <div
          className="relative w-full max-w-[430px] flex flex-col items-center gap-1.5 sm:gap-2"
          onPointerMove={handleBoardPointerMove}
          onPointerLeave={() => setHoverCell(null)}
        >
          {/* Story Goal / Duel Progress Strip */}
          {mode !== 'zen' && (
            <div
              data-testid="goal-progress-bar"
              className="w-full px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]"
            >
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold mb-0.5 sm:mb-1">
                <span className="text-[#2A1F15] dark:text-[#F5EDE1]">
                  {mode === 'duel' && isDailyPuzzleSeed(seedCode)
                    ? `Daily Haven Target (${goal.target.toLocaleString()}+)`
                    : goal.label}
                </span>
                <span className="font-mono-num text-[#1E3A2F] dark:text-amber-300">
                  {currentGoalVal.toLocaleString()} / {goal.target.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#D8C5A8] dark:bg-[#2B2017]">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-[#1E3A2F] dark:bg-amber-500"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          )}

          <GameBoard
            boardRef={boardRef}
            boardShape={activeLevelDef.boardShape}
            grid={grid}
            preview={activePreview}
            previewPiece={previewPiece}
            previewMaterial={previewPiece?.material ?? null}
            clearingKeys={clearingKeys}
            particleBursts={particleBursts}
            shakeKey={boardShakeKey}
            tileSkin={activeTileSkin}
            canTapToPlace={Boolean(selectedPiece)}
            firstMoveHookActive={
              mode === 'story' && levelNumber === 1 && movesPlaced === 0
            }
            onCellClick={handleCellClick}
          />

          {/* Floating Score / Special FX Banner */}
          {banner && (
            <div
              key={banner.id}
              data-testid="floating-banner"
              className="pointer-events-none absolute top-11 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-xl text-center shadow-xl border backdrop-blur-sm animate-float-score
                bg-[#1E3A2F]/95 border-emerald-900/40 text-[#FDF8F2] dark:bg-amber-500/95 dark:border-amber-200/40 dark:text-[#120D08]"
            >
              <div className="text-xs font-bold whitespace-nowrap">{banner.text}</div>
              {banner.subtext && (
                <div className="text-[10px] opacity-90 whitespace-nowrap">
                  {banner.subtext}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactical Dock (Guided First Sofa / JIT Tip / Pocket, Rotate, Undo, 3-Piece Tray) */}
        <section
          aria-label="Tactical Dock and Piece Tray"
          className="w-full max-w-[430px] lg:max-w-[380px] flex flex-col gap-1.5 sm:gap-2"
        >
          {/* First-Session Payoff: Non-Blocking, Skippable Guided First Sofa Prompt */}
          {showFirstSofaPrompt && (
            <div
              data-testid="guided-first-sofa-prompt"
              className="p-2.5 rounded-2xl border shadow-sm bg-emerald-50/95 border-emerald-300 text-emerald-950 dark:bg-[#131F1A] dark:border-emerald-500/40 dark:text-emerald-100"
            >
              {!firstSofaPlacedStyle && !haven.rooms.cottage_living?.sofa ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        First Double-Clear! · My Haven
                      </div>
                      <p className="text-xs font-medium leading-snug mt-0.5">
                        Spend 1 starter Cozy Star to place your first Living Room Sofa:
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="first-sofa-skip-btn"
                      onClick={handleSkipFirstSofa}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-emerald-400/50 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40 shrink-0"
                    >
                      Skip
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      data-testid="first-sofa-style-cottage_oak"
                      onClick={() => handlePlaceFirstSofa('cottage_oak')}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08]"
                    >
                      Cottagecore Oak (1 ★)
                    </button>
                    <button
                      type="button"
                      data-testid="first-sofa-style-minimalist_zen"
                      onClick={() => handlePlaceFirstSofa('minimalist_zen')}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-700/35 bg-white/90 text-emerald-950 hover:bg-white dark:bg-[#1B2A23] dark:border-emerald-500/40 dark:text-emerald-100"
                    >
                      Minimalist Zen (1 ★)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold">
                    Sofa placed in My Haven! Continue your board or peek at your room:
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      data-testid="first-sofa-peek-haven-btn"
                      onClick={() => setAppView('haven')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-emerald-600/40 bg-white/80 text-emerald-950 hover:bg-white dark:bg-[#1B2A23] dark:text-emerald-100"
                    >
                      Peek Haven
                    </button>
                    <button
                      type="button"
                      data-testid="first-sofa-return-board-btn"
                      onClick={() => setShowFirstSofaPrompt(false)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08]"
                    >
                      Back to Board
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contextual Just-In-Time (JIT) Dismissible Tooltip */}
          {activeJitTip && (
            <div
              data-testid={`jit-tip-${activeJitTip.id}`}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border bg-amber-50/90 border-amber-300/80 text-[#3B2A1A] dark:bg-[#1E1710] dark:border-amber-500/35 dark:text-amber-100"
            >
              <div className="text-[11px] leading-snug">
                <span className="font-bold mr-1">{activeJitTip.title}:</span>
                <span>{activeJitTip.body}</span>
              </div>
              <button
                type="button"
                data-testid="dismiss-jit-tip-btn"
                onClick={() => dismissTip(activeJitTip.id)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-amber-400/60 bg-amber-100/80 text-amber-950 hover:bg-amber-200/80 dark:bg-amber-500/20 dark:text-amber-200 shrink-0"
              >
                Got it
              </button>
            </div>
          )}

          {/* Anti-Frustration Controls */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Cozy Pocket */}
            <button
              ref={pocketRef}
              type="button"
              data-testid="pocket-slot"
              onClick={handlePocketClick}
              onPointerDown={(e) => {
                if (pocket && !canSwapOrPark) {
                  startPieceDrag(e, { kind: 'pocket' }, pocket);
                }
              }}
              aria-label={
                pocket
                  ? `Cozy Pocket holding ${pocket.name}. ${canSwapOrPark ? 'Click to swap with selected tray piece' : 'Drag or tap to place'}`
                  : canSwapOrPark
                    ? 'Cozy Pocket empty. Click or drag a piece here to hold'
                    : 'Cozy Pocket reserve slot empty'
              }
              className={`relative flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-xl border min-h-[68px] sm:min-h-[86px] touch-none transition-colors ${
                isOverPocket
                  ? 'ring-2 ring-amber-500 bg-amber-100/90 border-amber-500 dark:bg-amber-500/20 dark:border-amber-400'
                  : selectedSource?.kind === 'pocket'
                    ? 'ring-2 ring-[#1E3A2F] dark:ring-amber-400 bg-[#E6D8C0] border-[#B49A75] dark:bg-[#241C16] dark:border-amber-500/60'
                    : 'bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E8D9C1] dark:bg-[#191410] dark:border-[#3A2B1F] dark:hover:bg-[#211A14]'
              }`}
            >
              <div className="w-full flex items-center justify-between text-[10px] font-semibold text-[#6E5A46] dark:text-[#B4A08A]">
                <span>Pocket</span>
                <Inbox className="w-3 h-3" />
              </div>

              <div className="flex-1 flex items-center justify-center py-0.5 sm:py-1">
                {pocket &&
                !(
                  dragSession?.hasMoved &&
                  dragSession.source.kind === 'pocket'
                ) ? (
                  <PiecePreview
                    piece={pocket}
                    cellSize={13}
                    gap={1.5}
                    tileSkin={activeTileSkin}
                  />
                ) : (
                  <span className="text-[11px] font-medium text-[#8C7760] dark:text-[#786552]">
                    {canSwapOrPark ? 'Tap / Drop' : 'Hold 1'}
                  </span>
                )}
              </div>

              <div className="text-[10px] font-medium text-[#6E5A46] dark:text-[#B4A08A] whitespace-nowrap">
                {pocket ? (canSwapOrPark ? 'Swap' : 'Ready') : 'Reserve'}
              </div>
            </button>

            {/* Combo-Earned Rotation */}
            <div className="flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border min-h-[68px] sm:min-h-[86px] bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#191410] dark:border-[#3A2B1F]">
              <div className="w-full flex items-center justify-between text-[10px] font-semibold text-[#6E5A46] dark:text-[#B4A08A]">
                <span>Rotate</span>
                <span
                  data-testid="rotate-charges"
                  className="font-mono-num font-bold text-[#1E3A2F] dark:text-amber-300"
                >
                  {rotateCharges}
                </span>
              </div>

              <button
                type="button"
                data-testid="rotate-button"
                onClick={handleRotateSelected}
                disabled={rotateCharges <= 0}
                aria-label={`Rotate selected piece 90 degrees clockwise. ${rotateCharges} charges available`}
                className={`w-full flex items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors ${
                  rotateCharges > 0
                    ? 'bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] active:scale-[0.98] dark:bg-amber-600 dark:text-[#120D08] dark:hover:bg-amber-500'
                    : 'bg-[#D6C4AA] text-[#7A654F] cursor-not-allowed dark:bg-[#2A2018] dark:text-[#7D6A56]'
                }`}
              >
                <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Spin</span>
              </button>

              <div className="w-full flex items-center justify-between gap-1">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#D8C5A8] dark:bg-[#2C2118]">
                  <div
                    className="h-full bg-[#0F766E] dark:bg-amber-400 transition-all duration-200"
                    style={{ width: `${Math.min(100, rotateGaugePct)}%` }}
                  />
                </div>
                {nativeRuntime || monetization.noAdsBundlePurchased ? (
                  <button
                    type="button"
                    data-testid="ad-reward-rotate"
                    onClick={handleRewardRotate}
                    aria-label="Get +1 Rotate Charge"
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#0F766E] hover:underline dark:text-amber-300 shrink-0"
                  >
                    <Film className="w-2.5 h-2.5" />
                    <span>+1</span>
                  </button>
                ) : (
                  <span className="font-mono-num text-[9px] text-[#7A654F] dark:text-[#A4907B] shrink-0">
                    {Math.min(100, rotateGaugePct)}%
                  </span>
                )}
              </div>
            </div>

            {/* Tactical Undo */}
            <div className="flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border min-h-[68px] sm:min-h-[86px] bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#191410] dark:border-[#3A2B1F]">
              <div className="w-full flex items-center justify-between text-[10px] font-semibold text-[#6E5A46] dark:text-[#B4A08A]">
                <span>Undo</span>
                <span
                  data-testid="undo-charges"
                  className="font-mono-num font-bold text-[#1E3A2F] dark:text-amber-300"
                >
                  {undoCharges}
                </span>
              </div>

              <button
                type="button"
                data-testid="undo-button"
                onClick={handleUndo}
                disabled={undoCharges <= 0 || undoStack.length === 0}
                aria-label={`Undo last placed piece. ${undoCharges} charges left`}
                className={`w-full flex items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors ${
                  undoCharges > 0 && undoStack.length > 0
                    ? 'bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-600 dark:text-[#120D08] dark:hover:bg-amber-500'
                    : 'bg-[#D8C5A8] text-[#7A654F] cursor-not-allowed dark:bg-[#261D16] dark:text-[#7A6754]'
                }`}
              >
                <Undo2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Undo</span>
              </button>

              {nativeRuntime || monetization.noAdsBundlePurchased ? (
                <button
                  type="button"
                  data-testid="recharge-undo-button"
                  onClick={handleRechargeUndo}
                  aria-label="Refill 1 Tactical Undo charge"
                  className="w-full inline-flex items-center justify-center gap-1 py-0.5 rounded text-[10px] font-semibold text-[#0F766E] hover:underline dark:text-amber-300"
                >
                  {monetization.noAdsBundlePurchased ? (
                    <PlusCircle className="w-3 h-3" />
                  ) : (
                    <Film className="w-3 h-3" />
                  )}
                  <span>
                    {monetization.noAdsBundlePurchased ? 'Refill +1' : 'Ad +1 Undo'}
                  </span>
                </button>
              ) : (
                <div className="text-[9px] text-center font-medium text-[#7A654F] dark:text-[#A4907B] truncate">
                  Rewind last move
                </div>
              )}
            </div>
          </div>

          {/* 3-Piece Solvable Artisan Tray */}
          <div
            data-testid="piece-tray"
            className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-2xl border
              bg-[#E7D8C0] border-[#CDB694] shadow-inner
              dark:bg-[#14100C] dark:border-[#33251B]"
          >
            {tray.map((piece, idx) => {
              const isSelected =
                selectedSource?.kind === 'tray' && selectedSource.index === idx;
              const isBeingDragged =
                dragSession?.hasMoved &&
                dragSession.source.kind === 'tray' &&
                dragSession.source.index === idx;

              const specialLabel = piece?.specialType
                ? SPECIAL_BLOCK_META[piece.specialType].shortLabel
                : null;

              return (
                <div
                  key={piece ? `${trayWaveId}_${piece.uid}` : `empty_${idx}`}
                  data-testid={`tray-slot-${idx}`}
                  onPointerDown={(e) => {
                    if (piece) startPieceDrag(e, { kind: 'tray', index: idx }, piece);
                  }}
                  role={piece ? 'button' : undefined}
                  tabIndex={piece ? 0 : -1}
                  aria-label={
                    piece
                      ? `Tray slot ${idx + 1}: ${piece.name} in ${MATERIAL_META[piece.material].label}${
                          piece.specialType
                            ? ` with ${SPECIAL_BLOCK_META[piece.specialType].label}`
                            : ''
                        }`
                      : `Tray slot ${idx + 1} empty`
                  }
                  onKeyDown={(e) => {
                    if (piece && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      cozyAudio.playPickup(piece.material);
                      setSelectedSource({ kind: 'tray', index: idx });
                    }
                  }}
                  style={
                    piece ? { animationDelay: `${idx * 55}ms` } : undefined
                  }
                  className={`relative flex flex-col items-center justify-center h-[76px] sm:h-[96px] px-1 overflow-hidden rounded-xl border touch-none transition-all duration-150 ${
                    piece ? 'animate-tray-slide' : ''
                  } ${
                    piece
                      ? isSelected
                        ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#1E3A2F] dark:ring-amber-400 bg-[#FAF5EC] border-[#B49A75] dark:bg-[#221A14] dark:border-amber-500/60'
                        : 'cursor-grab active:cursor-grabbing bg-[#F3E9D8] border-[#D8C5A8] hover:bg-[#FAF5EC] dark:bg-[#1B1510] dark:border-[#35271D] dark:hover:bg-[#221A14]'
                      : 'bg-[#DFCEB2]/45 border-dashed border-[#C7B08D] dark:bg-[#0E0B08]/50 dark:border-[#2A1F16]'
                  }`}
                >
                  {piece && !isBeingDragged ? (
                    <PiecePreview
                      piece={piece}
                      cellSize={13}
                      gap={1.5}
                      maxWidth={78}
                      maxHeight={46}
                      tileSkin={activeTileSkin}
                    />
                  ) : null}
                  {piece && !isBeingDragged && (
                    <span className="mt-1 sm:mt-1.5 text-[10px] leading-tight font-medium text-[#6E5A46] dark:text-[#A4907B] truncate max-w-full px-1">
                      {specialLabel
                        ? `${MATERIAL_META[piece.material].shortLabel} · ${specialLabel}`
                        : MATERIAL_META[piece.material].shortLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Special Ability Hint / Lines Counter */}
          <div className="flex items-start justify-between gap-2 px-1 text-[10px] sm:text-[11px] leading-snug text-[#7A654F] dark:text-[#9D8A76]">
            <span className="inline-flex items-start gap-1 min-w-0">
              <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="break-words">
                {selectedPiece?.specialType
                  ? `${SPECIAL_BLOCK_META[selectedPiece.specialType].label}: ${SPECIAL_BLOCK_META[selectedPiece.specialType].description}`
                  : selectedPiece
                    ? `Selected: ${selectedPiece.name} (${MATERIAL_META[selectedPiece.material].shortLabel})`
                    : 'Drag or tap a block to place'}
              </span>
            </span>
            <span className="font-mono-num shrink-0 ml-1">Lines {linesCleared}</span>
          </div>
        </section>
      </main>
      )}

      {/* Floating Drag Ghost */}
      {dragSession && dragSession.hasMoved && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragSession.clientX,
            top:
              dragSession.clientY +
              (dragSession.pointerType === 'touch'
                ? TOUCH_THUMB_Y_OFFSET
                : MOUSE_LIFT_Y_OFFSET),
            transform: 'translate(-50%, -50%) scale(1.04)',
          }}
        >
          <PiecePreview
            piece={dragSession.piece}
            cellSize={boardCellPx}
            gap={4}
            tileSkin={activeTileSkin}
          />
        </div>
      )}

      {/* Pause Modal */}
      {phase === 'paused' && !showLeaveMatchModal && (
        <PauseModal
          stats={runStats}
          nightCandleMode={nightCandleMode}
          muted={muted}
          onResume={() => {
            document.body.dataset.state = 'playing';
            setPhase('playing');
          }}
          onRestart={() => startRun(mode, levelNumber, seedCode)}
          onBackToTitle={() => {
            matchHistorySentinelRef.current = false;
            document.body.dataset.state = 'title';
            setPhase('title');
          }}
          onToggleTheme={() => setNightCandleMode((v) => !v)}
          onToggleMute={toggleMute}
        />
      )}

      {/* Back-Navigation Pause / Leave Match Confirmation Modal */}
      {showLeaveMatchModal && (
        <LeaveMatchModal
          stats={runStats}
          onKeepPlaying={() => {
            setShowLeaveMatchModal(false);
            document.body.dataset.state = 'playing';
            setPhase('playing');
          }}
          onLeaveToTitle={() => {
            setShowLeaveMatchModal(false);
            matchHistorySentinelRef.current = false;
            document.body.dataset.state = 'title';
            setPhase('title');
          }}
        />
      )}

      {/* Victory Modal */}
      {phase === 'victory' && (
        <VictoryModal
          stats={runStats}
          noAdsOwned={monetization.noAdsBundlePurchased}
          starsDoubled={starsDoubledThisRun}
          seedPackAwarded={seedPackAwardedThisRun}
          onDoubleStars={handleDoubleVictoryStars}
          onNextLevel={() => startRun('story', levelNumber + 1)}
          onVisitHaven={() => {
            startRun('story', levelNumber + 1);
            setAppView('haven');
            setPetCelebrating(true);
          }}
          onReplay={() => startRun('story', levelNumber)}
          onBackToTitle={() => {
            matchHistorySentinelRef.current = false;
            document.body.dataset.state = 'title';
            setPhase('title');
            if (canAutoShowDailyStreakPopup(monetization, unlockedLevel)) {
              setShowDailyStreakModal(true);
            }
          }}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          stats={runStats}
          canUndoRescue={undoCharges > 0 && undoStack.length > 0}
          noAdsOwned={monetization.noAdsBundlePurchased}
          isNewBest={score > 0 && score >= runStats.bestScore}
          lostStreakCount={preLossStreak}
          onReviveClear3x3={handleReviveClear3x3}
          onUndoRescue={handleUndo}
          onPlayAgain={() => startRun(mode, levelNumber, seedCode)}
          onBackToTitle={() => {
            matchHistorySentinelRef.current = false;
            document.body.dataset.state = 'title';
            setPhase('title');
          }}
        />
      )}

      {/* How to Play Help Modal */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {/* Store Bundle Modal */}
      {showBundleModal && (
        <StarterBundleModal
          purchased={monetization.noAdsBundlePurchased}
          onPurchase={handlePurchaseBundle}
          onClose={() => setShowBundleModal(false)}
        />
      )}

      {/* 3-Tab Cozy Shop Modal */}
      {showShopModal && (
        <ShopModal
          initialTab={shopInitialTab}
          cozyGems={cozyGems}
          noAdsOwned={monetization.noAdsBundlePurchased}
          unlockedPremiumItems={unlockedPremiumItems}
          activePet={haven.activePet}
          activeTileSkin={activeTileSkin}
          activeWindowTheme={activeWindowTheme}
          onPurchaseStoreProduct={handlePurchaseStoreProduct}
          onWatchFreeGemsAd={handleWatchFreeGemsAd}
          onPurchaseGemItem={handlePurchaseGemItem}
          onEquipCosmetic={handleEquipCosmetic}
          onClose={() => setShowShopModal(false)}
        />
      )}

      {/* 3-Tab Cozy Journal Modal */}
      {showJournalModal && (
        <JournalModal
          initialTab={journalInitialTab}
          context={milestoneContext}
          claimedMilestones={claimedMilestones}
          dailyBestScore={dailyBestScore}
          onClaimMilestone={handleClaimMilestone}
          onPlayDailyToday={() => {
            setShowJournalModal(false);
            handleStartDailyPuzzle();
          }}
          onClose={() => setShowJournalModal(false)}
        />
      )}

      {/* Daily Streak Modal */}
      {showDailyStreakModal && (
        <DailyStreakModal
          monetization={monetization}
          onClaim={handleClaimDailyStreak}
          onClose={() => setShowDailyStreakModal(false)}
        />
      )}

      {/* Player Settings Drawer / Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          adConsentStatus={monetization.adConsentStatus}
          noAdsOwned={monetization.noAdsBundlePurchased}
          onUpdateSettings={updateSettings}
          onGenerateBackupCode={handleGenerateBackupCode}
          onRestoreBackupCode={handleRestoreBackupCode}
          onRestorePurchases={handleRestorePurchases}
          onRequestAdConsent={handleRequestAdConsent}
          onOpenPrivacyTerms={() => setShowPrivacyModal(true)}
          onResetAllData={handleResetAllData}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Privacy Policy & Terms Modal */}
      {showPrivacyModal && (
        <PrivacyTermsModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Play Store Rate Us Prompt (4th Cozy Room Upgrade Milestone, Native Only) */}
      {showRateUsModal && nativeRuntime && (
        <RateUsModal
          onRateNow={() => {
            setShowRateUsModal(false);
            void triggerNativeInAppReview();
            cozyAudio.playRewardChime();
            showBanner('Thank you for 5★!', 'Your rating helps HavenBlocks grow');
          }}
          onDismiss={() => setShowRateUsModal(false)}
        />
      )}

      {/* Simulated 2s Play Store Rewarded Ad Overlay (Native Only) */}
      {adStatus?.active && nativeRuntime && <RewardedAdModal status={adStatus} />}
    </div>
  );
}
