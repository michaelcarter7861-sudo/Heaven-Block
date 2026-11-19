import { createDefaultHavenProgress } from './haven';
import { createDefaultHerbariumProgress } from './herbarium';
import {
  createDefaultLifetimeStats,
  createDefaultPetBondState,
} from './journal';
import { createDefaultMonetizationState } from './monetization';
import type {
  HavenChapterId,
  JitTipId,
  PersistedState,
  PlayerSettings,
} from './types';

export const STORAGE_KEY = 'havenblocks_v2_save';
export const MAX_PERSISTED_UNDO_STEPS = 5;
export const STARTING_COZY_GEMS = 50;
const BACKUP_PREFIX = 'HAVEN-SAVE-V2:';
const VALID_TIPS: JitTipId[] = ['rotate', 'pocket', 'undo'];
const VALID_CHAPTERS: HavenChapterId[] = [
  'cottage_living',
  'zen_garden',
  'rainy_conservatory',
];

export function createDefaultPlayerSettings(muted = false): PlayerSettings {
  return {
    soundEnabled: !muted,
    hapticsEnabled: true,
    screenShakeEnabled: true,
    ambientSoundEnabled: false,
    colorblindMode: false,
  };
}

export function createDefaultPersistedState(): PersistedState {
  return {
    version: 2,
    bestScore: 0,
    duelBestScore: 0,
    cozyStars: 2, // Starter welcome stars so players can restore their first Haven piece immediately
    cozyGems: STARTING_COZY_GEMS, // Starter welcome gems for the Cozy Shop
    unlockedPremiumItems: [],
    activeTileSkin: 'classic',
    activeWindowTheme: 'classic',
    unlockedLevel: 1,
    currentLevel: 1,
    fireflyStreak: 0,
    levelStars: {},
    levelLosses: {},
    nightCandleMode: false,
    muted: false,
    settings: createDefaultPlayerSettings(false),
    haven: createDefaultHavenProgress(),
    herbarium: createDefaultHerbariumProgress(),
    monetization: createDefaultMonetizationState(),
    dismissedTips: [],
    firstSofaPromptDone: false,
    completedDailyDates: [],
    dailyBestScore: 0,
    petBond: createDefaultPetBondState(),
    lifetimeStats: createDefaultLifetimeStats(),
    claimedMilestones: [],
    rewardedCompletedChapters: [],
    activeRun: null,
  };
}

export function normalizePersistedState(
  parsed: Partial<PersistedState> | null | undefined
): PersistedState {
  if (!parsed || parsed.version !== 2) {
    return createDefaultPersistedState();
  }
  const fallbackHaven = createDefaultHavenProgress();
  const fallbackHerb = createDefaultHerbariumProgress();
  const parsedHaven = parsed.haven;
  const parsedHerb = parsed.herbarium;
  const parsedMon = parsed.monetization;
  const parsedSettings = parsed.settings;
  const muted = Boolean(parsed.muted);

  const soundEnabled =
    typeof parsedSettings?.soundEnabled === 'boolean'
      ? parsedSettings.soundEnabled
      : !muted;

  const unlockedPremiumItems = Array.isArray(parsed.unlockedPremiumItems)
    ? Array.from(
        new Set(
          parsed.unlockedPremiumItems.filter(
            (id): id is string => typeof id === 'string' && id.length > 0
          )
        )
      )
    : [];

  const dismissedTips = Array.isArray(parsed.dismissedTips)
    ? Array.from(
        new Set(
          parsed.dismissedTips.filter((t): t is JitTipId =>
            VALID_TIPS.includes(t as JitTipId)
          )
        )
      )
    : [];

  const completedDailyDates = Array.isArray(parsed.completedDailyDates)
    ? Array.from(
        new Set(
          parsed.completedDailyDates.filter(
            (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
          )
        )
      )
    : [];

  const activePetCandidate = parsedHaven?.activePet;
  const resolvedPet =
    activePetCandidate === 'lop_bunny' &&
    unlockedPremiumItems.includes('pet_lop_bunny')
      ? 'lop_bunny'
      : activePetCandidate === 'shiba_pup'
        ? 'shiba_pup'
        : 'ginger_cat';

  return {
    version: 2,
    bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
    duelBestScore:
      typeof parsed.duelBestScore === 'number' ? parsed.duelBestScore : 0,
    cozyStars: typeof parsed.cozyStars === 'number' ? parsed.cozyStars : 2,
    cozyGems:
      typeof parsed.cozyGems === 'number' && parsed.cozyGems >= 0
        ? Math.floor(parsed.cozyGems)
        : STARTING_COZY_GEMS,
    unlockedPremiumItems,
    activeTileSkin:
      parsed.activeTileSkin === 'golden_lantern' &&
      unlockedPremiumItems.includes('skin_golden_lantern')
        ? 'golden_lantern'
        : 'classic',
    activeWindowTheme:
      parsed.activeWindowTheme === 'rainy_conservatory' &&
      unlockedPremiumItems.includes('theme_rainy_window')
        ? 'rainy_conservatory'
        : 'classic',
    unlockedLevel:
      typeof parsed.unlockedLevel === 'number'
        ? Math.max(1, parsed.unlockedLevel)
        : 1,
    currentLevel:
      typeof parsed.currentLevel === 'number'
        ? Math.max(1, parsed.currentLevel)
        : 1,
    fireflyStreak:
      typeof parsed.fireflyStreak === 'number'
        ? Math.max(0, Math.min(5, parsed.fireflyStreak))
        : 0,
    levelStars: parsed.levelStars ?? {},
    levelLosses: parsed.levelLosses ?? {},
    nightCandleMode: Boolean(parsed.nightCandleMode),
    muted: !soundEnabled,
    settings: {
      soundEnabled,
      hapticsEnabled:
        typeof parsedSettings?.hapticsEnabled === 'boolean'
          ? parsedSettings.hapticsEnabled
          : true,
      screenShakeEnabled:
        typeof parsedSettings?.screenShakeEnabled === 'boolean'
          ? parsedSettings.screenShakeEnabled
          : true,
      ambientSoundEnabled: Boolean(parsedSettings?.ambientSoundEnabled),
      colorblindMode: Boolean(parsedSettings?.colorblindMode),
    },
    haven: parsedHaven
      ? {
          activeChapter: VALID_CHAPTERS.includes(
            parsedHaven.activeChapter as HavenChapterId
          )
            ? (parsedHaven.activeChapter as HavenChapterId)
            : 'cottage_living',
          activePet: resolvedPet,
          rooms: {
            cottage_living: parsedHaven.rooms?.cottage_living ?? {},
            zen_garden: parsedHaven.rooms?.zen_garden ?? {},
            rainy_conservatory: parsedHaven.rooms?.rainy_conservatory ?? {},
          },
        }
      : fallbackHaven,
    herbarium: parsedHerb
      ? {
          unlockedCardIds: Array.isArray(parsedHerb.unlockedCardIds)
            ? parsedHerb.unlockedCardIds
            : [],
          cardCounts: parsedHerb.cardCounts ?? {},
          seedPacks:
            typeof parsedHerb.seedPacks === 'number'
              ? parsedHerb.seedPacks
              : fallbackHerb.seedPacks,
          goldenLeaves:
            typeof parsedHerb.goldenLeaves === 'number'
              ? parsedHerb.goldenLeaves
              : 0,
          unlockedAccessories: Array.isArray(parsedHerb.unlockedAccessories)
            ? parsedHerb.unlockedAccessories
            : [],
          equippedAccessory: parsedHerb.equippedAccessory ?? null,
          storyWinsCount:
            typeof parsedHerb.storyWinsCount === 'number'
              ? parsedHerb.storyWinsCount
              : 0,
        }
      : fallbackHerb,
    monetization: parsedMon
      ? {
          noAdsBundlePurchased: Boolean(parsedMon.noAdsBundlePurchased),
          starterOfferShown: Boolean(parsedMon.starterOfferShown),
          ratingPromptShown: Boolean(parsedMon.ratingPromptShown),
          adConsentStatus:
            parsedMon.adConsentStatus === 'obtained' ? 'obtained' : 'unknown',
          streakCount:
            typeof parsedMon.streakCount === 'number'
              ? parsedMon.streakCount
              : 0,
          lastClaimDate: parsedMon.lastClaimDate ?? null,
          totalDaysClaimed:
            typeof parsedMon.totalDaysClaimed === 'number'
              ? parsedMon.totalDaysClaimed
              : 0,
        }
      : createDefaultMonetizationState(),
    dismissedTips,
    firstSofaPromptDone: Boolean(parsed.firstSofaPromptDone),
    completedDailyDates,
    dailyBestScore:
      typeof parsed.dailyBestScore === 'number' && parsed.dailyBestScore >= 0
        ? Math.floor(parsed.dailyBestScore)
        : 0,
    petBond: parsed.petBond
      ? {
          level:
            typeof parsed.petBond.level === 'number' && parsed.petBond.level >= 1
              ? Math.floor(parsed.petBond.level)
              : 1,
          xp:
            typeof parsed.petBond.xp === 'number' && parsed.petBond.xp >= 0
              ? Math.floor(parsed.petBond.xp)
              : 0,
          lastTreatDate:
            typeof parsed.petBond.lastTreatDate === 'string'
              ? parsed.petBond.lastTreatDate
              : null,
        }
      : createDefaultPetBondState(),
    lifetimeStats: parsed.lifetimeStats
      ? {
          totalLinesCleared:
            typeof parsed.lifetimeStats.totalLinesCleared === 'number'
              ? Math.max(0, Math.floor(parsed.lifetimeStats.totalLinesCleared))
              : 0,
          highestComboEver:
            typeof parsed.lifetimeStats.highestComboEver === 'number'
              ? Math.max(0, Math.floor(parsed.lifetimeStats.highestComboEver))
              : 0,
          totalBlocksPlaced:
            typeof parsed.lifetimeStats.totalBlocksPlaced === 'number'
              ? Math.max(0, Math.floor(parsed.lifetimeStats.totalBlocksPlaced))
              : 0,
          totalAcornGems:
            typeof parsed.lifetimeStats.totalAcornGems === 'number'
              ? Math.max(0, Math.floor(parsed.lifetimeStats.totalAcornGems))
              : 0,
          totalStoryWins:
            typeof parsed.lifetimeStats.totalStoryWins === 'number'
              ? Math.max(0, Math.floor(parsed.lifetimeStats.totalStoryWins))
              : 0,
          bestFireflyStreak: Math.max(
            typeof parsed.fireflyStreak === 'number'
              ? Math.max(0, Math.min(5, Math.floor(parsed.fireflyStreak)))
              : 0,
            typeof parsed.lifetimeStats.bestFireflyStreak === 'number'
              ? Math.max(
                  0,
                  Math.min(5, Math.floor(parsed.lifetimeStats.bestFireflyStreak))
                )
              : 0
          ),
        }
      : {
          ...createDefaultLifetimeStats(),
          bestFireflyStreak:
            typeof parsed.fireflyStreak === 'number'
              ? Math.max(0, Math.min(5, Math.floor(parsed.fireflyStreak)))
              : 0,
        },
    claimedMilestones: Array.isArray(parsed.claimedMilestones)
      ? Array.from(
          new Set(
            parsed.claimedMilestones.filter(
              (id): id is string => typeof id === 'string' && id.length > 0
            )
          )
        )
      : [],
    rewardedCompletedChapters: Array.isArray(parsed.rewardedCompletedChapters)
      ? Array.from(
          new Set(
            parsed.rewardedCompletedChapters.filter((ch): ch is HavenChapterId =>
              VALID_CHAPTERS.includes(ch as HavenChapterId)
            )
          )
        )
      : [],
    activeRun: parsed.activeRun
      ? {
          ...parsed.activeRun,
          undoStack: Array.isArray(parsed.activeRun.undoStack)
            ? parsed.activeRun.undoStack.slice(-MAX_PERSISTED_UNDO_STEPS)
            : [],
        }
      : null,
  };
}

export function loadPersistedState(): PersistedState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultPersistedState();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = window.localStorage.getItem('havenblocks_v2_phase1_save');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as {
          bestScore?: number;
          nightCandleMode?: boolean;
          muted?: boolean;
        };
        const base = createDefaultPersistedState();
        const muted = Boolean(legacy.muted);
        return {
          ...base,
          bestScore: typeof legacy.bestScore === 'number' ? legacy.bestScore : 0,
          nightCandleMode: Boolean(legacy.nightCandleMode),
          muted,
          settings: createDefaultPlayerSettings(muted),
        };
      }
      return createDefaultPersistedState();
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return normalizePersistedState(parsed);
  } catch {
    return createDefaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const boundedState: PersistedState = state.activeRun
      ? {
          ...state,
          activeRun: {
            ...state.activeRun,
            undoStack: state.activeRun.undoStack.slice(
              -MAX_PERSISTED_UNDO_STEPS
            ),
          },
        }
      : state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boundedState));
  } catch {
    // Ignore storage errors
  }
}

function fnv1aHex(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function encodeUtf8Base64(text: string): string {
  if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(text, 'utf8').toString('base64');
}

function decodeUtf8Base64(b64: string): string {
  if (typeof TextDecoder !== 'undefined' && typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

/**
 * Encodes the player's save state into a portable, checksum-verified backup string.
 */
export function exportSaveBackupString(state: PersistedState): string {
  const normalized = normalizePersistedState(state);
  const json = JSON.stringify(normalized);
  const encoded = encodeUtf8Base64(json);
  const checksum = fnv1aHex(encoded);
  return `${BACKUP_PREFIX}${checksum}:${encoded}`;
}

/**
 * Decodes and validates a HavenBlocks save backup string.
 */
export function importSaveBackupString(
  raw: string
): { ok: true; state: PersistedState } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) {
    return { ok: false, error: 'Paste a HavenBlocks backup code first.' };
  }
  if (!trimmed.startsWith(BACKUP_PREFIX)) {
    return {
      ok: false,
      error: 'Invalid backup code format (must start with HAVEN-SAVE-V2:).',
    };
  }
  const rest = trimmed.slice(BACKUP_PREFIX.length);
  const sepIdx = rest.indexOf(':');
  if (sepIdx <= 0) {
    return { ok: false, error: 'Backup code appears incomplete or malformed.' };
  }
  const checksum = rest.slice(0, sepIdx).toUpperCase();
  const payloadB64 = rest.slice(sepIdx + 1);
  if (!payloadB64 || fnv1aHex(payloadB64) !== checksum) {
    return {
      ok: false,
      error: 'Backup code checksum failed — please check for missing characters.',
    };
  }

  try {
    const json = decodeUtf8Base64(payloadB64);
    const parsed = JSON.parse(json) as Partial<PersistedState>;
    if (!parsed || parsed.version !== 2) {
      return { ok: false, error: 'Unsupported backup save version.' };
    }
    return { ok: true, state: normalizePersistedState(parsed) };
  } catch {
    return { ok: false, error: 'Could not decode backup data.' };
  }
}

