import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  CloudRain,
  Gift,
  Heart,
  Home,
  Leaf,
  Lock,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import {
  applyFurnitureStyle,
  FURNITURE_SLOTS,
  FURNITURE_STYLES,
  getRoomCompletion,
  getSlotCost,
  getSlotLabelForChapter,
  HAVEN_CHAPTER_META,
  HAVEN_IDLE_THRESHOLD_MS,
  PET_IDLE_DURATION_MS,
  PET_META,
  pickRandomPetIdleAction,
  type FurnitureSlotDefinition,
  type PetIdleAction,
} from '../game/haven';
import {
  canGiveDailyPetTreat,
  getFurnitureMemoryNote,
  PET_BOND_XP_PER_LEVEL,
  PET_TREAT_DAILY_GEMS,
} from '../game/journal';
import { cozyAudio } from '../game/audio';
import type {
  FurnitureSlotId,
  FurnitureStyleId,
  HavenChapterId,
  HavenProgress,
  HerbariumProgress,
  JournalTabId,
  PetBondState,
  PetKind,
  ShopTabId,
  WindowThemeId,
} from '../game/types';
import { HerbariumView } from './HerbariumView';
import { PostcardModal } from './PostcardModal';

interface HavenRoomProps {
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  petBond: PetBondState;
  cozyStars: number;
  unlockedLevel: number;
  bestScore: number;
  fireflyStreak: number;
  nightCandleMode: boolean;
  petCelebrating: boolean;
  unlockedPremiumItems: string[];
  activeWindowTheme: WindowThemeId;
  claimableMilestonesCount?: number;
  seedCode?: string;
  onUpdateHaven: (nextHaven: HavenProgress, nextStars: number) => void;
  onUpdateHerbarium: (nextHerbarium: HerbariumProgress) => void;
  onGivePetTreat: () => { given: boolean; message: string };
  onOpenShop: (tab?: ShopTabId) => void;
  onOpenJournal: (tab?: JournalTabId) => void;
  onBackToPuzzle: () => void;
  onClearPetCelebration: () => void;
}

interface StylePalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  trim: string;
  cushion: string;
  cushionAccent: string;
  metal: string;
  glow: string;
}

const STYLE_PALETTES: Record<FurnitureStyleId, StylePalette> = {
  cottage_oak: {
    primary: '#B8722C',
    primaryDark: '#7C4716',
    secondary: '#F1DFC4',
    trim: '#3F6B4E',
    cushion: '#D98A4E',
    cushionAccent: '#F6E6CF',
    metal: '#C89B3C',
    glow: '#FBBF24',
  },
  minimalist_zen: {
    primary: '#8CA492',
    primaryDark: '#55695B',
    secondary: '#F4F1EA',
    trim: '#435347',
    cushion: '#DCE3DA',
    cushionAccent: '#6C8472',
    metal: '#7D877E',
    glow: '#FDE68A',
  },
  starlight_velvet: {
    primary: '#3C467B',
    primaryDark: '#23294D',
    secondary: '#E2B659',
    trim: '#6D4C7D',
    cushion: '#4B5694',
    cushionAccent: '#F3C969',
    metal: '#E2B659',
    glow: '#FCD34D',
  },
};

const FIREFLIES = [
  { x: 145, y: 185, delay: '0s', r: 3.2 },
  { x: 290, y: 140, delay: '0.7s', r: 2.6 },
  { x: 465, y: 170, delay: '1.4s', r: 3.0 },
  { x: 610, y: 240, delay: '0.4s', r: 3.4 },
  { x: 245, y: 315, delay: '1.9s', r: 2.8 },
  { x: 525, y: 335, delay: '1.1s', r: 3.0 },
];

export const HavenRoom: React.FC<HavenRoomProps> = ({
  haven,
  herbarium,
  petBond,
  cozyStars,
  unlockedLevel,
  bestScore,
  fireflyStreak,
  nightCandleMode,
  petCelebrating,
  unlockedPremiumItems,
  activeWindowTheme,
  claimableMilestonesCount = 0,
  seedCode,
  onUpdateHaven,
  onUpdateHerbarium,
  onGivePetTreat,
  onOpenShop,
  onOpenJournal,
  onBackToPuzzle,
  onClearPetCelebration,
}) => {
  const isBunnyUnlocked = unlockedPremiumItems.includes('pet_lop_bunny');
  const isRainyWindow = activeWindowTheme === 'rainy_conservatory';
  const chapter = haven.activeChapter;
  const isAttic = chapter === 'rainy_conservatory';
  const isZen = chapter === 'zen_garden';
  const showRain = isRainyWindow || isAttic;
  const roomMap = haven.rooms[chapter] ?? {};
  const completion = getRoomCompletion(haven, chapter);
  const canTreatToday = canGiveDailyPetTreat(petBond);

  const [subTab, setSubTab] = useState<'room' | 'scrapbook'>('room');
  const [showPostcard, setShowPostcard] = useState<boolean>(false);
  const [selectedSlotId, setSelectedSlotId] = useState<FurnitureSlotId>('sofa');
  const [recentBounceKey, setRecentBounceKey] = useState<string | null>(null);
  const [petHopTick, setPetHopTick] = useState<number>(0);
  const [petBubble, setPetBubble] = useState<string | null>(null);
  const [petIdleAction, setPetIdleAction] = useState<PetIdleAction | null>(null);
  const [petIdleTick, setPetIdleTick] = useState<number>(0);
  const lastIdleActionRef = useRef<PetIdleAction | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const selectedSlot: FurnitureSlotDefinition =
    FURNITURE_SLOTS.find((s) => s.id === selectedSlotId) ?? FURNITURE_SLOTS[0];
  const currentStyle = roomMap[selectedSlot.id];
  const slotCost = currentStyle ? 0 : getSlotCost(selectedSlot.id);
  const slotLabel = getSlotLabelForChapter(selectedSlot, chapter);
  const currentMemory = currentStyle
    ? getFurnitureMemoryNote(chapter, selectedSlot.id)
    : null;

  useEffect(() => {
    if (petCelebrating) {
      setPetIdleAction(null);
      setPetHopTick((t) => t + 1);
      setPetBubble('Yay! Victory ★');
      const timer = window.setTimeout(() => {
        setPetBubble(null);
        onClearPetCelebration();
      }, 2800);
      return () => window.clearTimeout(timer);
    }
  }, [petCelebrating, onClearPetCelebration]);

  useEffect(() => {
    if (subTab !== 'room' || showPostcard || petCelebrating || petBubble) {
      setPetIdleAction(null);
      return;
    }

    let cancelled = false;
    let idleTimer: number | null = null;
    let endTimer: number | null = null;

    const clearTimers = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (endTimer !== null) {
        window.clearTimeout(endTimer);
        endTimer = null;
      }
    };

    const scheduleNextIdle = (delayMs: number) => {
      clearTimers();
      idleTimer = window.setTimeout(() => {
        if (cancelled) return;
        const nextAction = pickRandomPetIdleAction(lastIdleActionRef.current);
        lastIdleActionRef.current = nextAction;
        setPetIdleAction(nextAction);
        setPetIdleTick((t) => t + 1);

        endTimer = window.setTimeout(() => {
          if (cancelled) return;
          setPetIdleAction(null);
          const nextPause = 5500 + Math.random() * 4500;
          scheduleNextIdle(nextPause);
        }, PET_IDLE_DURATION_MS[nextAction]);
      }, delayMs);
    };

    const handleUserActivity = () => {
      setPetIdleAction(null);
      scheduleNextIdle(HAVEN_IDLE_THRESHOLD_MS);
    };

    scheduleNextIdle(HAVEN_IDLE_THRESHOLD_MS);

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'pointermove',
      'keydown',
      'touchstart',
      'wheel',
    ];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    }

    return () => {
      cancelled = true;
      clearTimers();
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleUserActivity);
      }
    };
  }, [subTab, showPostcard, petCelebrating, petBubble]);

  const handleSelectChapter = (nextChapter: HavenChapterId) => {
    setFeedbackMsg(null);
    setPetIdleAction(null);
    onUpdateHaven(
      {
        ...haven,
        activeChapter: nextChapter,
      },
      cozyStars
    );
  };

  const handleSelectPet = (nextPet: PetKind) => {
    if (nextPet === 'lop_bunny' && !isBunnyUnlocked) {
      onOpenShop('shop');
      return;
    }
    cozyAudio.playPetReaction();
    setPetIdleAction(null);
    setPetHopTick((t) => t + 1);
    setPetBubble(PET_META[nextPet].callout);
    window.setTimeout(() => setPetBubble(null), 1600);
    onUpdateHaven(
      {
        ...haven,
        activePet: nextPet,
      },
      cozyStars
    );
  };

  const handleApplyStyle = (styleId: FurnitureStyleId) => {
    setPetIdleAction(null);
    const res = applyFurnitureStyle(
      haven,
      cozyStars,
      chapter,
      selectedSlot.id,
      styleId
    );
    if (!res.success) {
      setFeedbackMsg(
        `Need ${getSlotCost(selectedSlot.id)} Cozy Star${
          getSlotCost(selectedSlot.id) > 1 ? 's' : ''
        } — clear Story puzzles to earn more!`
      );
      return;
    }

    setFeedbackMsg(
      res.wasFirstUnlock
        ? `${slotLabel} restored!`
        : `${slotLabel} restyled`
    );
    setRecentBounceKey(`${chapter}-${selectedSlot.id}-${styleId}`);
    cozyAudio.playDecorate();
    onUpdateHaven(res.nextHaven, res.nextStars);
  };

  const handleTapPet = () => {
    cozyAudio.playPetReaction();
    setPetIdleAction(null);
    setPetHopTick((t) => t + 1);
    setPetBubble(PET_META[haven.activePet].callout);
    window.setTimeout(() => setPetBubble(null), 1500);
  };

  const handleTreatPetClick = () => {
    const res = onGivePetTreat();
    setFeedbackMsg(res.message);
    if (res.given) {
      setPetIdleAction(null);
      setPetHopTick((t) => t + 1);
      setPetBubble('Yum! +5 💎');
      window.setTimeout(() => setPetBubble(null), 2000);
    }
  };

  const getBounceClass = (slotId: FurnitureSlotId) => {
    const st = roomMap[slotId];
    if (!st) return '';
    return recentBounceKey === `${chapter}-${slotId}-${st}`
      ? 'animate-haven-bounce'
      : '';
  };

  const isSofaBuilt = Boolean(roomMap.sofa);
  const petX = isSofaBuilt ? 404 : 332;
  const petY = isSofaBuilt ? 240 : 356;

  return (
    <div
      data-testid="haven-room-view"
      className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 flex flex-col gap-3"
    >
      {/* Haven Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl p-2.5 sm:px-4 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Room vs Herbarium Scrapbook Sub-Tab */}
          <div
            role="tablist"
            aria-label="Haven sections"
            className="flex items-center gap-1 p-1 rounded-xl bg-[#E4D4BA] dark:bg-[#110D0A]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'room'}
              data-testid="haven-subtab-room"
              onClick={() => setSubTab('room')}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'room'
                  ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08]'
                  : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Cozy Room</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'scrapbook'}
              data-testid="haven-subtab-scrapbook"
              onClick={() => setSubTab('scrapbook')}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'scrapbook'
                  ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08]'
                  : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Herbarium ({herbarium.unlockedCardIds.length}/24)</span>
            </button>
          </div>

          {/* Chapter Tabs (only when viewing Room) */}
          {subTab === 'room' && (
            <div
              role="tablist"
              aria-label="Haven Chapters"
              className="flex items-center gap-1 p-1 rounded-xl bg-[#E4D4BA] dark:bg-[#110D0A]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chapter === 'cottage_living'}
                data-testid="chapter-cottage"
                onClick={() => handleSelectChapter('cottage_living')}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chapter === 'cottage_living'
                    ? 'bg-[#FAF5EC] text-[#1E3A2F] shadow-sm dark:bg-[#2A2018] dark:text-amber-300'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <span>Ch. 1 Cottage</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chapter === 'zen_garden'}
                data-testid="chapter-zen"
                onClick={() => handleSelectChapter('zen_garden')}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chapter === 'zen_garden'
                    ? 'bg-[#FAF5EC] text-[#1E3A2F] shadow-sm dark:bg-[#2A2018] dark:text-amber-300'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>Ch. 2 Zen</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chapter === 'rainy_conservatory'}
                data-testid="chapter-conservatory"
                onClick={() => handleSelectChapter('rainy_conservatory')}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chapter === 'rainy_conservatory'
                    ? 'bg-[#FAF5EC] text-[#1E3A2F] shadow-sm dark:bg-[#2A2018] dark:text-amber-300'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Ch. 3 Attic</span>
              </button>
            </div>
          )}
        </div>

        {/* Completion + Pet Toggle + Share Postcard */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
          {/* Pet Picker */}
          <div className="flex items-center gap-1 rounded-xl p-1 bg-[#E4D4BA] dark:bg-[#110D0A]">
            {(['ginger_cat', 'shiba_pup', 'lop_bunny'] as PetKind[]).map((kind) => {
              const locked = kind === 'lop_bunny' && !isBunnyUnlocked;
              return (
                <button
                  key={kind}
                  type="button"
                  data-testid={`pet-select-${kind}`}
                  onClick={() => handleSelectPet(kind)}
                  aria-label={
                    locked
                      ? `Unlock ${PET_META[kind].name} in Cozy Shop`
                      : `Choose ${PET_META[kind].name} companion`
                  }
                  className={`inline-flex items-center gap-1 min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    haven.activePet === kind
                      ? 'bg-[#FAF5EC] text-[#1E3A2F] shadow-sm dark:bg-[#2A2018] dark:text-amber-300'
                      : locked
                        ? 'text-[#8C7760] hover:text-[#2A1F15] dark:text-[#8E7C69] dark:hover:text-amber-200'
                        : 'text-[#6E5A46] hover:text-[#2A1F15] dark:text-[#9D8A76]'
                  }`}
                >
                  {locked && <Lock className="w-3 h-3 shrink-0" />}
                  <span>
                    {kind === 'ginger_cat'
                      ? 'Cat'
                      : kind === 'shiba_pup'
                        ? 'Pup'
                        : 'Bunny'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A654F] dark:text-[#A4907B]">
              Restored
            </span>
            <span
              data-testid="haven-completion-text"
              className="font-mono-num text-xs font-bold text-[#1E3A2F] dark:text-amber-200 whitespace-nowrap"
            >
              {completion.unlocked}/{completion.total} · {completion.pct}%
            </span>
          </div>

          <button
            type="button"
            data-testid="open-journal-from-haven"
            onClick={() => onOpenJournal('memories')}
            aria-label="Open Cozy Journal and Haven Memories"
            className="relative inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors
              bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] hover:bg-[#E7D8C0]
              dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-amber-300 dark:hover:bg-[#2C221A]"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Journal</span>
            {claimableMilestonesCount > 0 && (
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-amber-500"
              />
            )}
          </button>

          <button
            type="button"
            data-testid="share-haven-postcard"
            onClick={() => setShowPostcard(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors
              bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] hover:bg-[#E7D8C0]
              dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-amber-300 dark:hover:bg-[#2C221A]"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Haven Postcard</span>
            <span className="sm:hidden">Postcard</span>
          </button>

          <span className="sr-only" data-testid="haven-stars-count">
            {cozyStars}
          </span>
        </div>
      </div>

      {subTab === 'scrapbook' ? (
        <HerbariumView
          herbarium={herbarium}
          unlockedLevel={unlockedLevel}
          onUpdateHerbarium={onUpdateHerbarium}
        />
      ) : (
        <>
      {/* Interactive 2.5D Isometric Illustrated Room Stage (strict 8:5 aspect so pins align 1:1 with SVG) */}
      <div className="relative w-full max-w-[736px] aspect-[8/5] mx-auto rounded-2xl overflow-hidden border-2 shadow-lg border-[#CDB694] bg-[#EADBC3] dark:border-[#3B2D21] dark:bg-[#0E0A07]">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-full block"
          role="img"
          aria-label={HAVEN_CHAPTER_META[chapter].title}
          data-window-theme={activeWindowTheme}
        >
          <defs>
            {/* Room Wall & Sky Gradients */}
            <linearGradient id="daySky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9BD2EB" />
              <stop offset="65%" stopColor="#DCEEF5" />
              <stop offset="100%" stopColor="#FBE7BD" />
            </linearGradient>
            <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0C1329" />
              <stop offset="65%" stopColor="#1B2547" />
              <stop offset="100%" stopColor="#2F2C4C" />
            </linearGradient>
            <linearGradient id="rainySky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#132238" />
              <stop offset="55%" stopColor="#243B55" />
              <stop offset="100%" stopColor="#3B566E" />
            </linearGradient>
            <clipPath id="cottageWindowClip">
              <path d="M328,166 L328,81 Q400,38 472,81 L472,166 Z" />
            </clipPath>
            <linearGradient id="sunBeamGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.58" />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lampGlowGrad" cx="50%" cy="20%" r="65%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.62" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hearthGlowGrad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#FB923C" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#EA580C" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ================= BACKDROP SHELL ================= */}
          {chapter === 'cottage_living' ? (
            <g>
              {/* Left Isometric Wall */}
              <polygon
                points="0,0 400,0 400,265 0,365"
                fill={nightCandleMode ? '#251D17' : '#F3E7D4'}
              />
              {/* Right Isometric Wall */}
              <polygon
                points="400,0 800,0 800,365 400,265"
                fill={nightCandleMode ? '#1D1712' : '#E9D9C2'}
              />
              {/* Wainscot Lower Wall Trim */}
              <polygon
                points="0,285 400,195 400,265 0,365"
                fill={nightCandleMode ? '#33261C' : '#DFCAA9'}
              />
              <polygon
                points="400,195 800,285 800,365 400,265"
                fill={nightCandleMode ? '#2A1F17' : '#D4BD9A'}
              />
              <line
                x1="0"
                y1="285"
                x2="400"
                y2="195"
                stroke={nightCandleMode ? '#4A3728' : '#C2A67E'}
                strokeWidth="4"
              />
              <line
                x1="400"
                y1="195"
                x2="800"
                y2="285"
                stroke={nightCandleMode ? '#4A3728' : '#B89B72'}
                strokeWidth="4"
              />

              {/* Hardwood Isometric Floor */}
              <polygon
                points="0,365 400,265 800,365 800,500 0,500"
                fill={nightCandleMode ? '#2F2116' : '#CFA271'}
              />
              {/* Subtle Floor Plank Lines */}
              {[0.25, 0.5, 0.75].map((t, i) => (
                <line
                  key={`plank-l-${i}`}
                  x1={400 * t}
                  y1={265 + 100 * (1 - t)}
                  x2={800 * t}
                  y2={500}
                  stroke={nightCandleMode ? '#21160E' : '#B98A58'}
                  strokeWidth="2"
                  opacity="0.55"
                />
              ))}
              <line
                x1="400"
                y1="265"
                x2="400"
                y2="500"
                stroke={nightCandleMode ? '#21160E' : '#B98A58'}
                strokeWidth="2"
                opacity="0.55"
              />
              {/* Corner Seam */}
              <line
                x1="400"
                y1="0"
                x2="400"
                y2="265"
                stroke={nightCandleMode ? '#140F0B' : '#CEB896'}
                strokeWidth="3"
              />
            </g>
          ) : chapter === 'rainy_conservatory' ? (
            <g data-testid="chapter-conservatory-backdrop">
              {/* Chapter 3: Rainy Attic Conservatory Backdrop */}
              <polygon
                points="0,0 400,0 400,265 0,365"
                fill={nightCandleMode ? '#152028' : '#D5E3DF'}
              />
              <polygon
                points="400,0 800,0 800,365 400,265"
                fill={nightCandleMode ? '#101920' : '#C5D8D3'}
              />
              {/* Exposed Attic Timber Rafters */}
              <line
                x1="0"
                y1="95"
                x2="400"
                y2="12"
                stroke={nightCandleMode ? '#35261A' : '#8A623C'}
                strokeWidth="12"
              />
              <line
                x1="400"
                y1="12"
                x2="800"
                y2="95"
                stroke={nightCandleMode ? '#2B1F15' : '#7A5634'}
                strokeWidth="12"
              />
              <line
                x1="150"
                y1="62"
                x2="150"
                y2="328"
                stroke={nightCandleMode ? '#291E15' : '#8A623C'}
                strokeWidth="6"
                opacity="0.45"
              />
              <line
                x1="650"
                y1="62"
                x2="650"
                y2="328"
                stroke={nightCandleMode ? '#291E15' : '#7A5634'}
                strokeWidth="6"
                opacity="0.45"
              />
              {/* Botanical Wainscot Lower Panel */}
              <polygon
                points="0,285 400,195 400,265 0,365"
                fill={nightCandleMode ? '#1E2C34' : '#AFC4BE'}
              />
              <polygon
                points="400,195 800,285 800,365 400,265"
                fill={nightCandleMode ? '#18242C' : '#9FB7B0'}
              />
              <line
                x1="0"
                y1="285"
                x2="400"
                y2="195"
                stroke={nightCandleMode ? '#3A505E' : '#86A199'}
                strokeWidth="4"
              />
              <line
                x1="400"
                y1="195"
                x2="800"
                y2="285"
                stroke={nightCandleMode ? '#3A505E' : '#7B968E'}
                strokeWidth="4"
              />
              {/* Warm Cedar Attic Floorboards */}
              <polygon
                points="0,365 400,265 800,365 800,500 0,500"
                fill={nightCandleMode ? '#281E17' : '#A97A50'}
              />
              {[0.25, 0.5, 0.75].map((t, i) => (
                <line
                  key={`attic-plank-${i}`}
                  x1={400 * t}
                  y1={265 + 100 * (1 - t)}
                  x2={800 * t}
                  y2={500}
                  stroke={nightCandleMode ? '#1B130D' : '#8E623C'}
                  strokeWidth="2"
                  opacity="0.55"
                />
              ))}
              <line
                x1="400"
                y1="265"
                x2="400"
                y2="500"
                stroke={nightCandleMode ? '#1B130D' : '#8E623C'}
                strokeWidth="2"
                opacity="0.55"
              />
              {/* Corner Seam */}
              <line
                x1="400"
                y1="12"
                x2="400"
                y2="265"
                stroke={nightCandleMode ? '#0C1217' : '#8DA8A1'}
                strokeWidth="3"
              />
            </g>
          ) : (
            <g>
              {/* Chapter 2: Zen Tea Garden Backdrop */}
              <rect
                x="0"
                y="0"
                width="800"
                height="275"
                fill={
                  isRainyWindow
                    ? 'url(#rainySky)'
                    : nightCandleMode
                      ? 'url(#nightSky)'
                      : 'url(#daySky)'
                }
              />
              {isRainyWindow && (
                <g opacity="0.45" className="pointer-events-none">
                  {[60, 140, 220, 310, 410, 500, 590, 680, 750].map((rx, idx) => (
                    <line
                      key={`zen-rain-${idx}`}
                      x1={rx}
                      y1={12 + (idx % 3) * 18}
                      x2={rx - 22}
                      y2={98 + (idx % 3) * 20}
                      stroke="#BAE6FD"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              )}
              {/* Distant Misty Mountains */}
              <path
                d="M0,210 Q140,130 290,195 T580,175 T800,205 L800,275 L0,275 Z"
                fill={nightCandleMode || isRainyWindow ? '#1A2438' : '#A9C7B7'}
                opacity="0.7"
              />
              {/* Bamboo Garden Fence */}
              <rect
                x="0"
                y="215"
                width="800"
                height="60"
                fill={nightCandleMode ? '#2A2319' : '#8A7B57'}
              />
              {Array.from({ length: 24 }, (_, idx) => (
                <line
                  key={`fence-${idx}`}
                  x1={idx * 34 + 10}
                  y1="215"
                  x2={idx * 34 + 10}
                  y2="275"
                  stroke={nightCandleMode ? '#1A150E' : '#6D5F41'}
                  strokeWidth="3"
                />
              ))}

              {/* Raked Zen Gravel Courtyard */}
              <polygon
                points="0,275 800,275 800,500 0,500"
                fill={nightCandleMode ? '#24221F' : '#DFD8C8'}
              />
              {/* Raked Zen Ripples */}
              {[310, 345, 385, 430].map((ry) => (
                <path
                  key={ry}
                  d={`M20,${ry} Q220,${ry - 8} 400,${ry} T780,${ry}`}
                  fill="none"
                  stroke={nightCandleMode ? '#35312C' : '#C8BFA9'}
                  strokeWidth="2"
                  opacity="0.7"
                />
              ))}
              {/* Cedar Engawa Veranda Edge (Left / Back) */}
              <polygon
                points="0,255 560,255 520,315 0,315"
                fill={nightCandleMode ? '#3D2A1C' : '#B9834C'}
              />
              <line
                x1="0"
                y1="255"
                x2="560"
                y2="255"
                stroke={nightCandleMode ? '#5A3E29' : '#D59D64'}
                strokeWidth="4"
              />
              {/* Koi Pond Corner (Bottom Right) */}
              <ellipse
                cx="695"
                cy="430"
                rx="115"
                ry="62"
                fill={nightCandleMode ? '#142936' : '#5EA4AC'}
                stroke={nightCandleMode ? '#3B4239' : '#8B9A7D'}
                strokeWidth="10"
              />
              {/* Tiny Koi Fish */}
              <ellipse cx="670" cy="424" rx="11" ry="4.5" fill="#F97316" />
              <ellipse cx="712" cy="442" rx="9" ry="4" fill="#FDBA74" />
            </g>
          )}

          {/* ================= 1. WINDOW / SHOJI PAVILION ================= */}
          {(() => {
            const style = roomMap.window;
            if (!style) {
              return (
                <g opacity="0.55">
                  <rect
                    x="325"
                    y="45"
                    width="150"
                    height="125"
                    rx="14"
                    fill="none"
                    stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                    strokeWidth="2.5"
                    strokeDasharray="7 5"
                  />
                </g>
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`win-${style}`} className={getBounceClass('window')}>
                {!isZen ? (
                  <g>
                    {/* Bay Window / Skylight Conservatory Frame */}
                    <path
                      d="M318,175 L318,75 Q400,25 482,75 L482,175 Z"
                      fill={isAttic ? '#2E434D' : pal.primary}
                      stroke={pal.primaryDark}
                      strokeWidth="4"
                    />
                    {/* Sky Glass */}
                    <path
                      d="M328,166 L328,81 Q400,38 472,81 L472,166 Z"
                      fill={
                        showRain
                          ? 'url(#rainySky)'
                          : nightCandleMode
                            ? 'url(#nightSky)'
                            : 'url(#daySky)'
                      }
                    />
                    {/* Moon, Sun, or Rainy Conservatory Streaks */}
                    {showRain ? (
                      <g clipPath="url(#cottageWindowClip)" data-testid="rainy-window-overlay">
                        <circle cx="435" cy="84" r="11" fill="#E0F2FE" opacity="0.28" />
                        {[
                          [345, 72, 333, 108],
                          [368, 60, 355, 102],
                          [392, 68, 378, 114],
                          [416, 58, 402, 104],
                          [442, 70, 428, 115],
                          [462, 82, 448, 128],
                          [356, 118, 342, 158],
                          [386, 122, 372, 162],
                          [422, 116, 408, 158],
                          [454, 124, 440, 162],
                        ].map(([x1, y1, x2, y2], idx) => (
                          <line
                            key={`drop-${idx}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#BAE6FD"
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity="0.68"
                          />
                        ))}
                      </g>
                    ) : nightCandleMode ? (
                      <g>
                        <circle cx="435" cy="88" r="13" fill="#FEF3C7" />
                        <circle cx="441" cy="84" r="11" fill="#131B36" />
                        <circle cx="365" cy="78" r="1.8" fill="#FEF9C3" />
                        <circle cx="385" cy="96" r="1.5" fill="#FEF9C3" />
                        <circle cx="412" cy="68" r="2" fill="#FEF9C3" />
                      </g>
                    ) : (
                      <circle cx="435" cy="86" r="15" fill="#FDE047" opacity="0.9" />
                    )}
                    {/* Mullions */}
                    <line x1="400" y1="53" x2="400" y2="166" stroke={pal.secondary} strokeWidth="4" />
                    <line x1="328" y1="118" x2="472" y2="118" stroke={pal.secondary} strokeWidth="4" />
                    {isAttic && (
                      <>
                        <line x1="364" y1="62" x2="364" y2="166" stroke={pal.secondary} strokeWidth="2" opacity="0.7" />
                        <line x1="436" y1="62" x2="436" y2="166" stroke={pal.secondary} strokeWidth="2" opacity="0.7" />
                      </>
                    )}
                    {/* Drapes */}
                    <path d="M314,68 Q336,115 322,174 L306,174 L306,68 Z" fill={pal.trim} />
                    <path d="M486,68 Q464,115 478,174 L494,174 L494,68 Z" fill={pal.trim} />
                    {/* Sill & Flower Box */}
                    <rect x="308" y="170" width="184" height="12" rx="4" fill={pal.primaryDark} />
                    <circle cx="365" cy="166" r="6" fill="#EC4899" />
                    <circle cx="380" cy="164" r="7" fill="#F59E0B" />
                    <circle cx="395" cy="166" r="6" fill="#10B981" />
                  </g>
                ) : (
                  <g>
                    {/* Zen Shoji Pavilion */}
                    <rect
                      x="290"
                      y="35"
                      width="220"
                      height="175"
                      rx="6"
                      fill={pal.primaryDark}
                    />
                    <rect
                      x="302"
                      y="47"
                      width="196"
                      height="152"
                      fill={
                        isRainyWindow
                          ? '#7DD3FC'
                          : nightCandleMode
                            ? '#FDE68A'
                            : pal.secondary
                      }
                      opacity={isRainyWindow ? 0.45 : nightCandleMode ? 0.85 : 0.94}
                    />
                    {/* Shoji Lattice */}
                    {[350, 400, 450].map((lx) => (
                      <line key={lx} x1={lx} y1="47" x2={lx} y2="199" stroke={pal.primaryDark} strokeWidth="3" />
                    ))}
                    {[85, 123, 161].map((ly) => (
                      <line key={ly} x1="302" y1={ly} x2="498" y2={ly} stroke={pal.primaryDark} strokeWidth="2.5" />
                    ))}
                    {/* Roof Eaves */}
                    <polygon points="270,42 400,12 530,42" fill={pal.trim} />
                  </g>
                )}
              </g>
            );
          })()}

          {/* Daytime Diagonal Sunbeams from Window */}
          {!nightCandleMode && !showRain && roomMap.window && (
            <g className="pointer-events-none animate-sunbeam">
              <polygon
                points="330,115 470,115 620,440 280,440"
                fill="url(#sunBeamGrad)"
              />
            </g>
          )}

          {/* ================= 2. HANGING PLANTS / BAMBOO ================= */}
          {(() => {
            const style = roomMap.plants;
            if (!style) {
              return (
                <circle
                  cx="200"
                  cy="82"
                  r="28"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`plants-${style}`} className={getBounceClass('plants')}>
                <line x1="185" y1="0" x2="185" y2="55" stroke={pal.secondary} strokeWidth="2.5" />
                <line x1="228" y1="0" x2="228" y2="75" stroke={pal.secondary} strokeWidth="2.5" />
                {/* Pot 1 */}
                <path d="M168,55 L202,55 L196,80 L174,80 Z" fill={pal.primary} stroke={pal.primaryDark} strokeWidth="2" />
                <circle cx="174" cy="52" r="11" fill="#3F7D58" />
                <circle cx="188" cy="48" r="13" fill="#4E9469" />
                <circle cx="198" cy="55" r="10" fill="#2E6143" />
                <path d="M172,62 Q158,92 164,122" fill="none" stroke="#3F7D58" strokeWidth="4" strokeLinecap="round" />
                <path d="M196,65 Q208,95 201,126" fill="none" stroke="#4E9469" strokeWidth="4" strokeLinecap="round" />
                {/* Pot 2 */}
                <path d="M214,75 L242,75 L237,96 L219,96 Z" fill={pal.trim} stroke={pal.primaryDark} strokeWidth="2" />
                <circle cx="222" cy="70" r="10" fill="#5CA376" />
                <circle cx="234" cy="72" r="10" fill="#3F7D58" />
              </g>
            );
          })()}

          {/* ================= 3. BOOKSHELF / BONSAI ALCOVE ================= */}
          {(() => {
            const style = roomMap.bookshelf;
            if (!style) {
              return !isZen ? (
                <polygon
                  points="75,135 182,112 182,285 75,310"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  opacity="0.55"
                />
              ) : (
                <rect
                  x="76"
                  y="148"
                  width="110"
                  height="120"
                  rx="10"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`shelf-${style}`} className={getBounceClass('bookshelf')}>
                {!isZen ? (
                  <g>
                    {/* Bookshelf Isometric Box */}
                    <polygon points="75,132 180,108 180,295 75,322" fill={pal.primary} stroke={pal.primaryDark} strokeWidth="3" />
                    <polygon points="180,108 202,118 202,302 180,295" fill={pal.primaryDark} />
                    {/* Shelves */}
                    <line x1="82" y1="184" x2="174" y2="162" stroke={pal.primaryDark} strokeWidth="6" />
                    <line x1="82" y1="244" x2="174" y2="222" stroke={pal.primaryDark} strokeWidth="6" />
                    {/* Books */}
                    <rect x="90" y="142" width="11" height="32" fill="#D97706" transform="skewY(-12)" />
                    <rect x="103" y="139" width="12" height="35" fill={pal.trim} transform="skewY(-12)" />
                    <rect x="117" y="146" width="10" height="28" fill="#B91C1C" transform="skewY(-12)" />
                    <rect x="132" y="141" width="13" height="33" fill={pal.secondary} transform="skewY(-12)" />
                    {/* Lower Shelf Books + Ceramic Vase */}
                    <rect x="92" y="202" width="12" height="32" fill="#0F766E" transform="skewY(-12)" />
                    <rect x="106" y="206" width="11" height="28" fill="#F59E0B" transform="skewY(-12)" />
                    <ellipse cx="150" cy="212" rx="12" ry="15" fill={pal.secondary} />
                  </g>
                ) : (
                  <g>
                    {/* Zen Bonsai Stand on Engawa */}
                    <rect x="78" y="218" width="108" height="48" rx="4" fill={pal.primary} stroke={pal.primaryDark} strokeWidth="3" />
                    <rect x="106" y="204" width="52" height="14" rx="3" fill={pal.trim} />
                    <path d="M132,204 Q122,182 138,168" fill="none" stroke="#5C3A21" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="140" cy="162" r="18" fill="#3F7D58" />
                    <circle cx="122" cy="172" r="12" fill="#52996E" />
                    <circle cx="155" cy="174" r="11" fill="#2E6143" />
                  </g>
                )}
              </g>
            );
          })()}

          {/* ================= 4. HEARTH (FIREPLACE / STONE FOUNTAIN) ================= */}
          {(() => {
            const style = roomMap.hearth;
            if (!style) {
              return !isZen ? (
                <polygon
                  points="610,130 735,165 735,335 610,295"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  opacity="0.55"
                />
              ) : (
                <ellipse
                  cx="665"
                  cy="258"
                  rx="58"
                  ry="28"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`hearth-${style}`} className={getBounceClass('hearth')}>
                {!isZen ? (
                  <g>
                    {/* Warm Glow Aura in Night Mode or Rainy Attic */}
                    {(nightCandleMode || isAttic) && (
                      <circle cx="660" cy="260" r="115" fill="url(#hearthGlowGrad)" />
                    )}
                    {/* Chimney Breast / Cast-Iron Hearth */}
                    <polygon
                      points="615,85 735,122 735,340 615,295"
                      fill={isAttic ? '#334155' : pal.secondary}
                      stroke={isAttic ? '#1E293B' : pal.primaryDark}
                      strokeWidth="3"
                    />
                    <polygon
                      points="592,98 615,85 615,295 592,310"
                      fill={isAttic ? '#1E293B' : pal.primary}
                    />
                    {/* Mantelpiece */}
                    <polygon points="588,185 745,232 745,248 588,200" fill={pal.primaryDark} />
                    {/* Firebox */}
                    <polygon points="632,226 716,252 716,326 632,296" fill="#1F1612" />
                    {/* Logs & Flames */}
                    <ellipse cx="674" cy="296" rx="22" ry="7" fill="#5C3A21" />
                    <path d="M658,294 Q672,252 686,294 Z" fill="#F97316" />
                    <path d="M666,294 Q674,266 682,294 Z" fill="#FDE047" />
                  </g>
                ) : (
                  <g>
                    {/* Zen Stone Fountain */}
                    <ellipse cx="665" cy="272" rx="58" ry="26" fill={pal.primaryDark} />
                    <ellipse cx="665" cy="266" rx="48" ry="20" fill="#4BA3B5" />
                    {/* Bamboo Spout */}
                    <rect x="692" y="196" width="12" height="58" rx="4" fill="#6D8F4B" />
                    <line x1="696" y1="212" x2="660" y2="230" stroke="#80A75A" strokeWidth="9" strokeLinecap="round" />
                    <line x1="660" y1="232" x2="660" y2="262" stroke="#BAE6FD" strokeWidth="3" strokeDasharray="4 4" />
                    {/* Ripples */}
                    <ellipse cx="660" cy="266" rx="18" ry="7" fill="none" stroke="#E0F2FE" strokeWidth="2" opacity="0.8" />
                  </g>
                )}
              </g>
            );
          })()}

          {/* ================= 5. FLOOR LAMP / GARDEN LANTERN ================= */}
          {(() => {
            const style = roomMap.lamp;
            if (!style) {
              return (
                <rect
                  x="538"
                  y="110"
                  width="46"
                  height="155"
                  rx="20"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`lamp-${style}`} className={getBounceClass('lamp')}>
                {(nightCandleMode || isAttic) && (
                  <circle cx="560" cy="185" r="105" fill="url(#lampGlowGrad)" />
                )}
                {!isZen ? (
                  <g>
                    <ellipse cx="560" cy="272" rx="22" ry="9" fill={pal.primaryDark} />
                    <rect x="556" y="145" width="8" height="128" fill={pal.metal} />
                    <polygon
                      points="538,148 582,148 573,110 547,110"
                      fill={nightCandleMode ? '#FDE68A' : pal.secondary}
                      stroke={pal.trim}
                      strokeWidth="3"
                    />
                  </g>
                ) : (
                  <g>
                    {/* Granite Toro Garden Lantern */}
                    <ellipse cx="560" cy="270" rx="24" ry="10" fill={pal.primaryDark} />
                    <rect x="550" y="198" width="20" height="72" fill={pal.primary} />
                    <rect
                      x="542"
                      y="162"
                      width="36"
                      height="36"
                      rx="4"
                      fill={nightCandleMode ? '#FDE047' : pal.secondary}
                      stroke={pal.primaryDark}
                      strokeWidth="3"
                    />
                    <polygon points="532,166 560,140 588,166" fill={pal.trim} />
                  </g>
                )}
              </g>
            );
          })()}

          {/* ================= 6. RUG / STEPPING STONES ================= */}
          {(() => {
            const style = roomMap.rug;
            if (!style) {
              return (
                <polygon
                  points="400,315 565,382 400,455 235,382"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="8 6"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`rug-${style}`} className={getBounceClass('rug')}>
                {!isZen ? (
                  <g>
                    <polygon
                      points="400,312 575,384 400,462 225,384"
                      fill={pal.trim}
                      stroke={pal.secondary}
                      strokeWidth="5"
                    />
                    <polygon
                      points="400,334 528,384 400,440 272,384"
                      fill={pal.cushionAccent}
                      opacity="0.88"
                    />
                    <polygon
                      points="400,356 470,384 400,414 330,384"
                      fill={pal.primary}
                    />
                  </g>
                ) : (
                  <g>
                    {/* Moss-rimmed Stepping Stones */}
                    {[
                      { cx: 280, cy: 365, rx: 32, ry: 16 },
                      { cx: 355, cy: 392, rx: 36, ry: 18 },
                      { cx: 445, cy: 376, rx: 34, ry: 17 },
                      { cx: 522, cy: 405, rx: 30, ry: 15 },
                    ].map((st, idx) => (
                      <g key={idx}>
                        <ellipse cx={st.cx} cy={st.cy} rx={st.rx + 5} ry={st.ry + 4} fill="#4E7A55" opacity="0.7" />
                        <ellipse cx={st.cx} cy={st.cy} rx={st.rx} ry={st.ry} fill={pal.secondary} stroke={pal.primaryDark} strokeWidth="2.5" />
                      </g>
                    ))}
                  </g>
                )}
              </g>
            );
          })()}

          {/* ================= 7. COZY SOFA / TIMBER BENCH ================= */}
          {(() => {
            const style = roomMap.sofa;
            if (!style) {
              return (
                <polygon
                  points="250,245 450,195 450,285 250,335"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`sofa-${style}`} className={getBounceClass('sofa')}>
                {!isZen ? (
                  <g>
                    {/* Backrest */}
                    <polygon points="248,220 442,175 456,192 456,265 260,312 248,295" fill={pal.primary} stroke={pal.primaryDark} strokeWidth="3" />
                    {/* Seat Base */}
                    <polygon points="260,268 456,222 496,246 300,295" fill={pal.cushion} stroke={pal.primaryDark} strokeWidth="3" />
                    <polygon points="260,295 300,295 496,246 496,274 300,324 260,312" fill={pal.primaryDark} />
                    {/* Armrests & Cushions */}
                    <ellipse cx="285" cy="252" rx="18" ry="14" fill={pal.cushionAccent} />
                    <ellipse cx="430" cy="216" rx="17" ry="13" fill={pal.trim} />
                  </g>
                ) : (
                  <g>
                    {/* Zen Timber Bench */}
                    <polygon points="255,248 455,212 486,232 286,268" fill={pal.primary} stroke={pal.primaryDark} strokeWidth="3" />
                    <rect x="275" y="264" width="12" height="34" fill={pal.primaryDark} />
                    <rect x="448" y="230" width="12" height="34" fill={pal.primaryDark} />
                    {/* Zabuton Cushions */}
                    <ellipse cx="345" cy="244" rx="28" ry="11" fill={pal.cushionAccent} stroke={pal.trim} strokeWidth="2" />
                    <ellipse cx="416" cy="231" rx="26" ry="10" fill={pal.trim} />
                  </g>
                )}
              </g>
            );
          })()}

          {/* ================= 8. LIVING COZY PET ================= */}
          {(() => {
            const isStretching = petIdleAction === 'stretch';
            const isGrooming = petIdleAction === 'groom';
            const isEarFlicking = petIdleAction === 'ear_flick';
            const isSleeping = isSofaBuilt && !petBubble && !petIdleAction;
            const bodyAnimClass = isStretching ? 'animate-pet-stretch-body' : '';
            const headAnimClass = isStretching
              ? 'animate-pet-stretch-head'
              : isGrooming
                ? 'animate-pet-groom-head'
                : isEarFlicking
                  ? 'animate-pet-ear-head-tilt'
                  : '';
            const tailAnimClass = petIdleAction ? 'animate-pet-tail-swish' : '';

            return (
              <g
                transform={`translate(${petX}, ${petY})`}
                className="pointer-events-none"
                data-testid="living-cozy-pet-svg"
                data-pet-kind={haven.activePet}
                data-pet-idle={petIdleAction ?? 'none'}
                data-pet-idle-tick={petIdleTick}
              >
                <g key={`hop-${petHopTick}`} className={petHopTick > 0 ? 'animate-pet-hop' : ''}>
                  {/* Soft Shadow */}
                  <ellipse cx="0" cy="14" rx="24" ry="8" fill="#000000" opacity="0.22" />

                  <g key={`idle-${petIdleTick}`}>
                    {/* Body, Tail & Neck Accessories */}
                    <g className={bodyAnimClass}>
                      {haven.activePet === 'ginger_cat' ? (
                        <g>
                          {/* Curled Tail */}
                          <g className={tailAnimClass}>
                            <path
                              d="M16,6 Q34,2 28,-10"
                              fill="none"
                              stroke="#D97706"
                              strokeWidth="6"
                              strokeLinecap="round"
                            />
                          </g>
                          {/* Extended Stretch Forepaw */}
                          {isStretching && (
                            <g data-testid="pet-idle-stretch-paw">
                              <ellipse
                                cx="-23"
                                cy="11"
                                rx="9"
                                ry="4.5"
                                fill="#F59E0B"
                                stroke="#9A4E0B"
                                strokeWidth="1.8"
                              />
                            </g>
                          )}
                          {/* Body */}
                          <ellipse cx="0" cy="4" rx="20" ry="13" fill="#EA8C2A" stroke="#9A4E0B" strokeWidth="2" />
                          {/* Stripes */}
                          <path d="M-8,-6 L-6,2 M2,-7 L3,1" stroke="#9A4E0B" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : haven.activePet === 'lop_bunny' ? (
                        <g data-testid="pet-svg-lop_bunny-body">
                          {/* Cotton Pom Tail */}
                          <g className={tailAnimClass}>
                            <circle cx="19" cy="3" r="6" fill="#FFFBF5" stroke="#B7A392" strokeWidth="1.6" />
                          </g>
                          {isStretching && (
                            <g data-testid="pet-idle-stretch-paw">
                              <ellipse
                                cx="-23"
                                cy="11"
                                rx="8.5"
                                ry="4.2"
                                fill="#F6EFE6"
                                stroke="#9E8978"
                                strokeWidth="1.8"
                              />
                            </g>
                          )}
                          <ellipse cx="0" cy="4" rx="19.5" ry="13" fill="#F2E8DC" stroke="#9E8978" strokeWidth="2" />
                          <ellipse cx="-2" cy="8" rx="11" ry="6.5" fill="#FFFDF9" />
                        </g>
                      ) : (
                        <g>
                          {/* Shiba Tail */}
                          <g className={tailAnimClass}>
                            <path
                              d="M15,2 Q28,-12 18,-14"
                              fill="none"
                              stroke="#D98A3C"
                              strokeWidth="6"
                              strokeLinecap="round"
                            />
                          </g>
                          {/* Extended Stretch Forepaw */}
                          {isStretching && (
                            <g data-testid="pet-idle-stretch-paw">
                              <ellipse
                                cx="-23"
                                cy="11"
                                rx="9"
                                ry="4.5"
                                fill="#E69B4F"
                                stroke="#8B4D18"
                                strokeWidth="1.8"
                              />
                            </g>
                          )}
                          <ellipse cx="0" cy="4" rx="20" ry="13" fill="#DF9348" stroke="#8B4D18" strokeWidth="2" />
                          <ellipse cx="-2" cy="8" rx="12" ry="7" fill="#FEF3C7" />
                        </g>
                      )}

                      {/* Neck Accessories (Move with Body) */}
                      {herbarium.equippedAccessory === 'bell_collar' && (
                        <g data-testid="pet-svg-accessory-bell_collar">
                          <path d="M-21,0 Q-11,4 -1,0" fill="none" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
                          <circle cx="-11" cy="4" r="3.5" fill="#FBBF24" stroke="#92400E" strokeWidth="1.2" />
                        </g>
                      )}
                      {herbarium.equippedAccessory === 'bow_tie' && (
                        <g data-testid="pet-svg-accessory-bow_tie" transform="translate(-11, 2)">
                          <polygon points="-7,-3 0,0 -7,3" fill="#B91C1C" />
                          <polygon points="7,-3 0,0 7,3" fill="#B91C1C" />
                          <circle cx="0" cy="0" r="2.2" fill="#FCA5A5" />
                        </g>
                      )}
                      {herbarium.equippedAccessory === 'scarf' && (
                        <g data-testid="pet-svg-accessory-scarf">
                          <path d="M-22,-1 Q-11,4 0,-1 L2,5 Q-11,9 -22,4 Z" fill="#D97706" stroke="#92400E" strokeWidth="1.2" />
                          <polygon points="-6,4 -1,13 -8,14" fill="#F59E0B" />
                        </g>
                      )}
                    </g>

                    {/* Head, Ears, Face & Head Accessories */}
                    <g className={headAnimClass}>
                      {haven.activePet === 'ginger_cat' ? (
                        <g>
                          {/* Head */}
                          <circle cx="-12" cy="-10" r="13" fill="#F59E0B" stroke="#9A4E0B" strokeWidth="2" />
                          {/* Ears */}
                          <polygon
                            points="-22,-18 -19,-30 -11,-21"
                            fill="#F59E0B"
                            stroke="#9A4E0B"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-left' : ''}
                          />
                          <polygon
                            points="-10,-21 -3,-30 0,-18"
                            fill="#F59E0B"
                            stroke="#9A4E0B"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-right' : ''}
                          />
                          {/* Face */}
                          {isSleeping ? (
                            <g>
                              <path d="M-18,-10 Q-15,-7 -12,-10" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <path d="M-9,-10 Q-6,-7 -3,-10" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <text x="10" y="-22" fontSize="12" fill={nightCandleMode ? '#FDE68A' : '#6E5A46'} fontWeight="bold">
                                Zzz
                              </text>
                            </g>
                          ) : isStretching || isGrooming ? (
                            <g>
                              {/* Happy squinted eyes during stretch/groom */}
                              <path d="M-18,-9 Q-15,-13 -12,-9" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M-9,-9 Q-6,-13 -3,-9" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                            </g>
                          ) : (
                            <g>
                              <circle cx="-16" cy="-11" r="2" fill="#29170B" />
                              <circle cx="-7" cy="-11" r="2" fill="#29170B" />
                            </g>
                          )}
                          <polygon points="-13,-7 -10,-7 -11.5,-5" fill="#F43F5E" />
                        </g>
                      ) : haven.activePet === 'lop_bunny' ? (
                        <g data-testid="pet-svg-lop_bunny-head">
                          {/* Soft Floppy Lop Ears */}
                          <ellipse
                            cx="-23"
                            cy="-4"
                            rx="5.2"
                            ry="12"
                            transform="rotate(14 -23 -4)"
                            fill="#E3D2BF"
                            stroke="#9E8978"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-left' : ''}
                          />
                          <ellipse
                            cx="-1"
                            cy="-4"
                            rx="5.2"
                            ry="12"
                            transform="rotate(-14 -1 -4)"
                            fill="#E3D2BF"
                            stroke="#9E8978"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-right' : ''}
                          />
                          {/* Bunny Head */}
                          <circle cx="-12" cy="-10" r="13" fill="#F7F1E8" stroke="#9E8978" strokeWidth="2" />
                          <ellipse cx="-16.5" cy="-6.5" rx="2.6" ry="1.6" fill="#F9A8D4" opacity="0.55" />
                          <ellipse cx="-6.5" cy="-6.5" rx="2.6" ry="1.6" fill="#F9A8D4" opacity="0.55" />
                          {isSleeping ? (
                            <g>
                              <path d="M-18,-10 Q-15,-7 -12,-10" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <path d="M-9,-10 Q-6,-7 -3,-10" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <text x="10" y="-22" fontSize="12" fill={nightCandleMode ? '#FDE68A' : '#6E5A46'} fontWeight="bold">
                                Zzz
                              </text>
                            </g>
                          ) : isStretching || isGrooming ? (
                            <g>
                              <path d="M-18,-9 Q-15,-13 -12,-9" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M-9,-9 Q-6,-13 -3,-9" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                            </g>
                          ) : (
                            <g>
                              <circle cx="-16" cy="-11" r="2.1" fill="#29170B" />
                              <circle cx="-7" cy="-11" r="2.1" fill="#29170B" />
                            </g>
                          )}
                          <ellipse cx="-11.5" cy="-7" rx="2" ry="1.4" fill="#F472B6" />
                        </g>
                      ) : (
                        <g>
                          {/* Shiba Head */}
                          <circle cx="-12" cy="-11" r="13.5" fill="#E69B4F" stroke="#8B4D18" strokeWidth="2" />
                          <ellipse cx="-11" cy="-6" rx="10" ry="7" fill="#FEF3C7" />
                          {/* Perked Ears */}
                          <polygon
                            points="-22,-19 -20,-32 -11,-22"
                            fill="#C9782E"
                            stroke="#8B4D18"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-left' : ''}
                          />
                          <polygon
                            points="-9,-22 -1,-32 1,-19"
                            fill="#C9782E"
                            stroke="#8B4D18"
                            strokeWidth="1.8"
                            className={isEarFlicking ? 'animate-pet-ear-right' : ''}
                          />
                          {isSleeping ? (
                            <g>
                              <path d="M-17,-12 Q-14,-9 -11,-12" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <path d="M-8,-12 Q-5,-9 -2,-12" fill="none" stroke="#451A03" strokeWidth="1.8" />
                              <text x="10" y="-22" fontSize="12" fill={nightCandleMode ? '#FDE68A' : '#6E5A46'} fontWeight="bold">
                                Zzz
                              </text>
                            </g>
                          ) : isStretching || isGrooming ? (
                            <g>
                              <path d="M-17,-11 Q-14,-14.5 -11,-11" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M-8,-11 Q-5,-14.5 -2,-11" fill="none" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" />
                            </g>
                          ) : (
                            <g>
                              <circle cx="-15" cy="-12" r="2.2" fill="#1F1209" />
                              <circle cx="-6" cy="-12" r="2.2" fill="#1F1209" />
                            </g>
                          )}
                          <circle cx="-10.5" cy="-7" r="2.4" fill="#1F1209" />
                        </g>
                      )}

                      {/* Head Accessories (Move with Head) */}
                      {herbarium.equippedAccessory === 'glasses' && (
                        <g data-testid="pet-svg-accessory-glasses">
                          <circle cx="-16" cy="-11" r="4.2" fill="none" stroke="#451A03" strokeWidth="1.5" />
                          <circle cx="-7" cy="-11" r="4.2" fill="none" stroke="#451A03" strokeWidth="1.5" />
                          <line x1="-11.8" y1="-11" x2="-11.2" y2="-11" stroke="#451A03" strokeWidth="1.5" />
                        </g>
                      )}
                      {herbarium.equippedAccessory === 'flower_crown' && (
                        <g data-testid="pet-svg-accessory-flower_crown" transform="translate(-12, -23)">
                          <path d="M-10,2 Q0,-2 10,2" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="-6" cy="0" r="3" fill="#EC4899" />
                          <circle cx="0" cy="-2" r="3.4" fill="#FBBF24" />
                          <circle cx="6" cy="0" r="3" fill="#A855F7" />
                        </g>
                      )}
                      {herbarium.equippedAccessory === 'wizard_hat' && (
                        <g data-testid="pet-svg-accessory-wizard_hat" transform="translate(-12, -22)">
                          <ellipse cx="0" cy="1" rx="14" ry="3.5" fill="#4338CA" stroke="#1E1B4B" strokeWidth="1.4" />
                          <polygon points="-9,0 0,-19 9,0" fill="#4F46E5" stroke="#1E1B4B" strokeWidth="1.4" />
                          <circle cx="0" cy="-8" r="2" fill="#FDE047" />
                        </g>
                      )}
                    </g>

                    {/* Grooming Raised Paw Overlay */}
                    {isGrooming && (
                      <g data-testid="pet-idle-groom-paw" className="animate-pet-groom-paw">
                        <ellipse
                          cx="-18"
                          cy="-1"
                          rx="4.8"
                          ry="4"
                          fill={
                            haven.activePet === 'ginger_cat'
                              ? '#F59E0B'
                              : haven.activePet === 'lop_bunny'
                                ? '#FFFBF5'
                                : '#FEF3C7'
                          }
                          stroke={
                            haven.activePet === 'ginger_cat'
                              ? '#9A4E0B'
                              : haven.activePet === 'lop_bunny'
                                ? '#9E8978'
                                : '#8B4D18'
                          }
                          strokeWidth="1.6"
                        />
                        <circle
                          cx="-18"
                          cy="-1"
                          r="1.4"
                          fill={
                            haven.activePet === 'ginger_cat'
                              ? '#FDE68A'
                              : haven.activePet === 'lop_bunny'
                                ? '#F9A8D4'
                                : '#F4A261'
                          }
                        />
                      </g>
                    )}
                  </g>

                  {/* Pet Speech / Celebration Bubble */}
                  {petBubble && (
                    <g transform="translate(-8, -46)">
                      <rect
                        x="-46"
                        y="-16"
                        width="92"
                        height="24"
                        rx="12"
                        fill="#FAF5EC"
                        stroke="#D97706"
                        strokeWidth="2"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="bold"
                        fill="#7C2D12"
                      >
                        {petBubble}
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })()}

          {/* ================= 9. TEA TABLE / MATCHA SET ================= */}
          {(() => {
            const style = roomMap.table;
            if (!style) {
              return (
                <polygon
                  points="440,305 515,335 440,368 365,335"
                  fill="none"
                  stroke={nightCandleMode ? '#A89076' : '#8B7358'}
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  opacity="0.55"
                />
              );
            }
            const pal = STYLE_PALETTES[style];
            return (
              <g key={`table-${style}`} className={getBounceClass('table')}>
                {/* Table Legs */}
                <rect x="382" y="340" width="8" height="24" fill={pal.primaryDark} />
                <rect x="492" y="340" width="8" height="24" fill={pal.primaryDark} />
                <rect x="436" y="360" width="9" height="24" fill={pal.primaryDark} />
                {/* Table Top */}
                <polygon
                  points="440,304 522,336 440,370 358,336"
                  fill={pal.primary}
                  stroke={pal.primaryDark}
                  strokeWidth="3"
                />
                {/* Teapot & Cups */}
                <ellipse cx="428" cy="332" rx="13" ry="9" fill={pal.secondary} stroke={pal.trim} strokeWidth="2" />
                <circle cx="428" cy="323" r="4" fill={pal.trim} />
                <ellipse cx="456" cy="340" rx="6" ry="4" fill={pal.cushionAccent} stroke={pal.trim} strokeWidth="1.5" />
                <ellipse cx="470" cy="332" rx="6" ry="4" fill={pal.cushionAccent} stroke={pal.trim} strokeWidth="1.5" />
              </g>
            );
          })()}

          {/* Night Mode Drifting Fireflies */}
          {nightCandleMode && (
            <g className="pointer-events-none">
              {FIREFLIES.map((f, idx) => (
                <circle
                  key={idx}
                  cx={f.x}
                  cy={f.y}
                  r={f.r}
                  fill="#FDE047"
                  className="animate-firefly"
                  style={{ animationDelay: f.delay }}
                />
              ))}
            </g>
          )}
        </svg>

        {/* Interactive Overlay Hotspot Buttons (44px+ touch targets) */}
        {FURNITURE_SLOTS.map((slot) => {
          const builtStyle = roomMap[slot.id];
          const isSelected = selectedSlotId === slot.id;
          const label = getSlotLabelForChapter(slot, chapter);

          return (
            <button
              key={slot.id}
              type="button"
              data-testid={`hotspot-${slot.id}`}
              onClick={() => {
                setSelectedSlotId(slot.id);
                setFeedbackMsg(null);
              }}
              aria-label={
                builtStyle
                  ? `${label} (Restored — tap to restyle)`
                  : `Restore ${label} (${slot.cost} Cozy Stars)`
              }
              style={{
                left: `${slot.hotspotX}%`,
                top: `${slot.hotspotY}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center group focus:outline-none"
            >
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border shadow-md transition-transform group-hover:scale-110 ${
                  isSelected
                    ? 'ring-2 ring-amber-400 scale-110 bg-[#1E3A2F] text-[#FDF8F2] border-amber-300 dark:bg-amber-500 dark:text-[#120D08]'
                    : builtStyle
                      ? 'bg-[#FAF5EC]/92 text-[#1E3A2F] border-[#B49A75] dark:bg-[#1E1712]/90 dark:text-amber-300 dark:border-amber-500/50'
                      : 'bg-amber-100/95 text-amber-950 border-amber-500 dark:bg-[#241B12]/95 dark:text-amber-200 dark:border-amber-400/70'
                }`}
              >
                {builtStyle ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <>
                    <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    <span className="font-mono-num">{slot.cost}</span>
                  </>
                )}
              </span>
            </button>
          );
        })}

        {/* Interactive Cozy Pet Tap Button */}
        <button
          type="button"
          data-testid="cozy-pet"
          onClick={handleTapPet}
          aria-label={`Pet ${PET_META[haven.activePet].name}`}
          style={{
            left: `${(petX / 800) * 100}%`,
            top: `${(petY / 500) * 100}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 min-w-[52px] min-h-[52px] rounded-full flex items-end justify-center focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <span className="sr-only">Pet {PET_META[haven.activePet].name}</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 opacity-0 hover:opacity-90 transition-opacity mb-0.5" />
        </button>
      </div>

      {/* Pet Bond & Daily Cozy Treat Bar */}
      <div
        data-testid="pet-bond-bar"
        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            <Heart className="w-4 h-4 fill-current" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#2A1F15] dark:text-[#F5EDE1]">
                {PET_META[haven.activePet].name}
              </span>
              <span
                data-testid="pet-bond-level-badge"
                className="font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300"
              >
                Bond Lv {petBond.level} · {petBond.xp}/{PET_BOND_XP_PER_LEVEL}
              </span>
            </div>
            <p className="text-[11px] text-[#6E5A46] dark:text-[#B4A08A]">
              Daily treat gives +{PET_TREAT_DAILY_GEMS} Gems · Level-up grants +1 Rotate (never resets!)
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="give-pet-treat-btn"
          disabled={!canTreatToday}
          onClick={handleTreatPetClick}
          className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            canTreatToday
              ? 'bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08] dark:hover:bg-amber-400'
              : 'bg-[#E5D7C1] text-[#6E5A46] cursor-default dark:bg-[#221A14] dark:text-[#9D8A76]'
          }`}
        >
          {canTreatToday ? (
            <>
              <Gift className="w-3.5 h-3.5" />
              <span>Give Treat (+{PET_TREAT_DAILY_GEMS} Gems)</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Treated Today</span>
            </>
          )}
        </button>
      </div>

      {/* Style Picker & Restoration Drawer */}
      <div className="rounded-2xl p-3.5 sm:p-4 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5A46] dark:text-amber-300/80">
              {currentStyle ? 'Restored · Free Restyle' : `Unlock for ${slotCost} Cozy Star${slotCost > 1 ? 's' : ''}`}
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#2A1F15] dark:text-[#F5EDE1]">
              {slotLabel}
            </h2>
            {currentMemory && (
              <p
                data-testid="slot-memory-note"
                className="text-xs italic text-[#5C4936] dark:text-[#C4B29D] mt-0.5 leading-snug"
              >
                &ldquo;{currentMemory}&rdquo;
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {feedbackMsg && (
              <span
                data-testid="haven-feedback"
                className="text-xs font-semibold text-[#1E3A2F] dark:text-amber-300"
              >
                {feedbackMsg}
              </span>
            )}
            <button
              type="button"
              onClick={onBackToPuzzle}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border bg-[#FAF5EC] border-[#C9B292] text-[#2A1F15] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-[#F5EDE1] dark:hover:bg-[#2C221A]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Earn Stars</span>
            </button>
          </div>
        </div>

        {/* 3 Aesthetic Style Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FURNITURE_STYLES.map((st) => {
            const isActive = currentStyle === st.id;
            const cantAfford = !currentStyle && cozyStars < slotCost;

            return (
              <button
                key={st.id}
                type="button"
                data-testid={`style-choice-${st.id}`}
                onClick={() => handleApplyStyle(st.id)}
                className={`flex items-center justify-between gap-3 min-h-[52px] px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'ring-2 ring-[#1E3A2F] dark:ring-amber-400 bg-[#FAF5EC] border-[#1E3A2F] dark:bg-[#241C16] dark:border-amber-400'
                    : cantAfford
                      ? 'bg-[#E5D7C1]/70 border-[#D4C0A3] opacity-75 hover:opacity-100 dark:bg-[#130F0C] dark:border-[#2C2017]'
                      : 'bg-[#FAF5EC] border-[#D4C0A3] hover:bg-[#F5EBD9] active:scale-[0.99] dark:bg-[#211A14] dark:border-[#3A2B1F] dark:hover:bg-[#2A2018]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Style Color Swatches */}
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-4 h-4 rounded-full border border-black/15"
                      style={{ backgroundColor: st.accentHex }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/15"
                      style={{ backgroundColor: st.secondaryHex }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/15"
                      style={{ backgroundColor: st.trimHex }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#2A1F15] dark:text-[#F5EDE1] truncate">
                      {st.name}
                    </div>
                    <div className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
                      {isActive
                        ? 'Active Style'
                        : currentStyle
                          ? 'Free Swap'
                          : `${slotCost} ★`}
                    </div>
                  </div>
                </div>

                {isActive ? (
                  <Sparkles className="w-4 h-4 shrink-0 text-[#1E3A2F] dark:text-amber-300" />
                ) : cantAfford ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-[#8C7760]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
        </>
      )}

      {showPostcard && (
        <PostcardModal
          haven={haven}
          herbarium={herbarium}
          nightCandleMode={nightCandleMode}
          bestScore={bestScore}
          cozyStars={cozyStars}
          fireflyStreak={fireflyStreak}
          seedCode={seedCode}
          onClose={() => setShowPostcard(false)}
        />
      )}
    </div>
  );
};
