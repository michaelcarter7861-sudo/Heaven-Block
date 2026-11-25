import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Dices,
  Gem,
  Gift,
  Home,
  Infinity as InfinityIcon,
  Lock,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Swords,
  Trophy,
} from 'lucide-react';
import {
  BOARD_SHAPE_META,
  createDuelDefinition,
  getLevelDefinition,
  getLevelDifficultyMeta,
} from '../game/levels';
import { getSharePlayUrl, getTodayDateKey, isNativePlatform } from '../game/monetization';
import {
  generateSeedCode,
  hashSeedCode,
  mulberry32,
  normalizeSeedCode,
} from '../game/shapes';
import type { GameMode, JournalTabId, ShopTabId } from '../game/types';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  selectedMode: GameMode;
  selectedLevel: number;
  unlockedLevel: number;
  cozyStars: number;
  cozyGems: number;
  fireflyStreak: number;
  levelStars: Record<number, number>;
  bestScore: number;
  duelBestScore: number;
  hasSavedRun: boolean;
  savedRunLabel: string;
  nightCandleMode: boolean;
  seedCode: string;
  dailyStreakAvailable: boolean;
  dailyCompletedToday?: boolean;
  dailyBestScore?: number;
  claimableMilestonesCount?: number;
  noAdsOwned: boolean;
  onSelectMode: (mode: GameMode) => void;
  onSelectLevel: (level: number) => void;
  onToggleTheme: () => void;
  onSeedChange: (seed: string) => void;
  onResumeRun: () => void;
  onStartNewRun: () => void;
  onStartDailyPuzzle: () => void;
  onOpenHaven: () => void;
  onOpenShop: (tab?: ShopTabId) => void;
  onOpenJournal: (tab?: JournalTabId) => void;
  onOpenDailyStreak: () => void;
  onOpenBundle: () => void;
  onOpenSettings: () => void;
  onOpenPrivacyTerms: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  selectedLevel,
  unlockedLevel,
  cozyStars,
  cozyGems,
  fireflyStreak,
  levelStars,
  bestScore,
  duelBestScore,
  hasSavedRun,
  savedRunLabel,
  nightCandleMode,
  seedCode,
  dailyStreakAvailable,
  dailyCompletedToday = false,
  dailyBestScore = 0,
  claimableMilestonesCount = 0,
  noAdsOwned,
  onSelectMode,
  onSelectLevel,
  onToggleTheme,
  onSeedChange,
  onResumeRun,
  onStartNewRun,
  onStartDailyPuzzle,
  onOpenHaven,
  onOpenShop,
  onOpenJournal,
  onOpenDailyStreak,
  onOpenBundle,
  onOpenSettings,
  onOpenPrivacyTerms,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const isNative = isNativePlatform();

  const activeLevelDef = useMemo(
    () => getLevelDefinition(selectedLevel),
    [selectedLevel]
  );
  const activeDiffMeta = useMemo(
    () => getLevelDifficultyMeta(activeLevelDef),
    [activeLevelDef]
  );

  const duelPreview = useMemo(() => {
    const rng = mulberry32(hashSeedCode(seedCode));
    return createDuelDefinition(rng);
  }, [seedCode]);

  const levelChoices = useMemo(() => {
    const maxVisible = Math.max(8, unlockedLevel + 1);
    return Array.from({ length: maxVisible }, (_, i) => i + 1);
  }, [unlockedLevel]);

  const handleCopyDuel = async () => {
    const clean = normalizeSeedCode(seedCode);
    const shareUrl = getSharePlayUrl(clean);
    const shareText = shareUrl
      ? `Play this same board in HavenBlocks (Same starting board & seed: ${clean}): ${shareUrl}`
      : `HavenBlocks same starting board & seed: ${clean}`;
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      setCopyFallbackText(shareUrl ?? shareText);
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setCopyFallbackText(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyFallbackText(shareUrl ?? shareText);
    }
  };

  return (
    <main className="safe-area-shell min-h-dvh w-full bg-[#F6EFE4] text-[#2A1F15] dark:bg-[#0B0907] dark:text-[#F5EDE1] transition-colors duration-200">
      <div className="w-full max-w-4xl mx-auto min-h-dvh flex flex-col items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-6 sm:py-6">
        {/* Top Utility Row: 1 bar on desktop, 2 balanced rows on mobile */}
        <header className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="order-1 flex items-center gap-2 sm:gap-3 text-xs font-medium text-[#6E5A46] dark:text-[#B4A08A] min-w-0">
            <span className="hidden md:inline">Cozy Puzzle · 100% Offline</span>
            <OfflineIndicator />
            <span className="hidden md:inline" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-num font-semibold text-amber-700 dark:text-amber-300 shrink-0">
              <Star className="w-3.5 h-3.5 fill-current" />
              {cozyStars}
            </span>
            {fireflyStreak > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="title-firefly-streak"
                  className="font-mono-num font-semibold text-amber-700 dark:text-amber-300 truncate"
                >
                  <span className="hidden sm:inline">Lantern Streak </span>
                  <span className="sm:hidden">Streak </span>
                  {fireflyStreak}/5
                </span>
              </>
            )}
          </div>

          <div className="order-2 sm:ml-auto flex items-center gap-1.5">
            <PWAInstallButton />
            <button
              type="button"
              data-testid="title-gem-badge"
              onClick={() => onOpenShop('shop')}
              aria-label={`Open Cozy Shop (${cozyGems} Cozy Gems)`}
              className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0
                bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100
                dark:bg-[#151D26] dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-[#1D2835]"
            >
              <Gem className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
              <span className="font-mono-num">{cozyGems.toLocaleString()}</span>
              <Plus className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
            </button>
          </div>

          <div className="order-3 w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
            {unlockedLevel >= 2 && (
              <button
                type="button"
                data-testid="open-daily-streak"
                onClick={onOpenDailyStreak}
                aria-label="Open Daily Login Streak rewards"
                className="relative inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0
                  bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E6D7C0]
                  dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-200 dark:hover:bg-[#241C16]"
              >
                <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Daily Gift</span>
                {dailyStreakAvailable && (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-rose-500"
                  />
                )}
              </button>
            )}
            {unlockedLevel >= 2 && isNative && (
              <button
                type="button"
                data-testid="open-bundle-modal"
                onClick={onOpenBundle}
                aria-label="Open No Ads Cozy Starter Bundle"
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0
                  bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E6D7C0]
                  dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-200 dark:hover:bg-[#241C16]"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span className="hidden sm:inline">
                  {noAdsOwned ? 'VIP' : 'No Ads'}
                </span>
              </button>
            )}
            <button
              type="button"
              data-testid="open-journal-btn"
              onClick={() => onOpenJournal('calendar')}
              aria-label="Open Cozy Journal, Daily Calendar, and Milestones"
              className="relative inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0
                bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E6D7C0]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Journal</span>
              {claimableMilestonesCount > 0 && (
                <span
                  data-testid="title-journal-badge"
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
              )}
            </button>
            <button
              type="button"
              data-testid="title-haven-button"
              onClick={onOpenHaven}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap
                bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] hover:bg-[#E6D7C0]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>My Haven</span>
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={
                nightCandleMode
                  ? 'Switch to Warm Daylight mode'
                  : 'Switch to OLED Candlelight Night mode'
              }
              className="inline-flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E6D7C0]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              {nightCandleMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-amber-700" />
                  <span className="hidden sm:inline">Candlelight</span>
                </>
              )}
            </button>
            <button
              type="button"
              data-testid="open-settings-btn"
              onClick={onOpenSettings}
              aria-label="Open player settings"
              className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] px-2 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0
                bg-[#EFE4D2] border-[#D4C0A3] text-[#2A1F15] hover:bg-[#E6D7C0]
                dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-[#F5EDE1] dark:hover:bg-[#241C16]"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero Centerpiece */}
        <div className="w-full max-w-md sm:max-w-xl flex flex-col items-center text-center sm:my-auto py-1 sm:py-3">
          {/* Crafted Inline SVG Brand Lockup */}
          <div className="w-full max-w-[235px] sm:max-w-[360px] mb-1.5 sm:mb-2.5">
          <svg
            viewBox="0 0 420 132"
            className="w-full h-auto drop-shadow-sm"
            role="img"
            aria-label="HavenBlocks"
          >
            <defs>
              <linearGradient id="oakCarved" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E6AA5A" />
                <stop offset="55%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#7C2D12" />
              </linearGradient>
              <radialGradient id="stainedGlassO" cx="45%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#0F766E" />
              </radialGradient>
            </defs>

            <text
              x="210"
              y="46"
              textAnchor="middle"
              className="font-display font-bold"
              style={{
                fontSize: '42px',
                letterSpacing: '0.12em',
                fill: nightCandleMode ? '#FDF8F2' : '#1E3A2F',
              }}
            >
              HAVEN
            </text>

            <text
              x="142"
              y="102"
              textAnchor="middle"
              className="font-display font-bold"
              style={{
                fontSize: '44px',
                letterSpacing: '0.04em',
                fill: 'url(#oakCarved)',
              }}
            >
              BL
            </text>

            <g transform="translate(205, 86)">
              <circle
                cx="0"
                cy="0"
                r="22"
                fill="url(#stainedGlassO)"
                stroke="#1E3A2F"
                strokeWidth="3.5"
              />
              <line x1="0" y1="-21" x2="0" y2="21" stroke="#1E3A2F" strokeWidth="2.2" />
              <line x1="-21" y1="0" x2="21" y2="0" stroke="#1E3A2F" strokeWidth="2.2" />
              <circle cx="0" cy="0" r="8" fill="#FDF8F2" fillOpacity="0.65" />
              <path
                d="M-20 12 C-27 8, -26 -2, -19 -6 C-17 0, -16 7, -20 12 Z"
                fill="#2F6B4F"
              />
              <path
                d="M-14 19 C-18 25, -8 27, -4 21 C-8 18, -11 17, -14 19 Z"
                fill="#3E8262"
              />
              <g transform="translate(18, -17) rotate(22)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="5"
                  ry="3.2"
                  fill="#FBBF24"
                  stroke="#451A03"
                  strokeWidth="1"
                />
                <line x1="-1" y1="-3" x2="-1" y2="3" stroke="#451A03" strokeWidth="1.1" />
                <ellipse cx="-1" cy="-4.5" rx="2.6" ry="1.8" fill="#FEFCE8" fillOpacity="0.85" />
              </g>
            </g>

            <text
              x="278"
              y="102"
              textAnchor="middle"
              className="font-display font-bold"
              style={{
                fontSize: '44px',
                letterSpacing: '0.04em',
                fill: 'url(#oakCarved)',
              }}
            >
              CKS
            </text>
          </svg>
        </div>

        {/* Mode Segmented Selector */}
        <div
          role="tablist"
          aria-label="Game modes"
          className="grid grid-cols-3 gap-1 p-1 sm:p-1.5 rounded-2xl w-full max-w-md mb-2.5 sm:mb-4 border
            bg-[#E7D8C0] border-[#D4C0A3] dark:bg-[#15100C] dark:border-[#33251B]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedMode === 'story'}
            data-testid="mode-story"
            onClick={() => onSelectMode('story')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedMode === 'story'
                ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08] shadow-sm'
                : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Story</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedMode === 'duel'}
            data-testid="mode-duel"
            onClick={() => onSelectMode('duel')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedMode === 'duel'
                ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08] shadow-sm'
                : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
            }`}
          >
            <Swords className="w-3.5 h-3.5 shrink-0" />
            <span>Friend Duel</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedMode === 'zen'}
            data-testid="mode-zen"
            onClick={() => onSelectMode('zen')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedMode === 'zen'
                ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08] shadow-sm'
                : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
            }`}
          >
            <InfinityIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Endless Zen</span>
          </button>
        </div>

        {/* Mode Panel */}
        <div className="w-full max-w-md rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4 border text-left bg-[#EFE4D2] border-[#D8C5A8] dark:bg-[#17120E] dark:border-[#36281D]">
          {selectedMode === 'story' && (
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-[#6E5A46] dark:text-amber-300/85">
                    Level {activeLevelDef.levelNumber} ·{' '}
                    {BOARD_SHAPE_META[activeLevelDef.boardShape].name}
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-bold leading-snug">
                    {activeLevelDef.title}
                  </h2>
                  {activeDiffMeta.badgeLabel && (
                    <span
                      data-testid="sawtooth-difficulty-badge"
                      className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${
                        activeDiffMeta.tier === 'master_trial'
                          ? 'bg-amber-200/90 text-amber-950 border-amber-500/80 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/60'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-400/70 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/50'
                      }`}
                    >
                      {activeDiffMeta.badgeLabel}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] sm:text-[11px] text-[#6E5A46] dark:text-[#B4A08A]">
                    Goal
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-[#1E3A2F] dark:text-amber-300">
                    {activeLevelDef.goal.label}
                  </div>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-[#5C4936] dark:text-[#C4B29D] mb-2 sm:mb-3 leading-snug">
                {activeLevelDef.subtitle}
              </p>

              {/* Level Selector Grid */}
              <div className="grid grid-cols-5 gap-1.5 max-h-[126px] sm:max-h-[168px] overflow-y-auto pr-0.5">
                {levelChoices.map((lvl) => {
                  const locked = lvl > unlockedLevel;
                  const active = lvl === selectedLevel;
                  const stars = levelStars[lvl] ?? 0;
                  const isTrial = lvl % 5 === 0;
                  const isBloom = lvl > 1 && (lvl - 1) % 5 === 0;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={locked}
                      data-testid={`level-select-${lvl}`}
                      onClick={() => onSelectLevel(lvl)}
                      aria-label={
                        locked
                          ? `Level ${lvl} locked`
                          : `Select Level ${lvl}${isTrial ? ', Master Artisan Trial 2x Stars' : isBloom ? ', Bonus Bloom' : ''}, ${stars} stars earned`
                      }
                      className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border text-xs font-semibold transition-colors ${
                        locked
                          ? 'opacity-45 cursor-not-allowed bg-[#E5D6BE] border-[#CEBA9B] dark:bg-[#110D0A] dark:border-[#2A1F16]'
                          : active
                            ? 'bg-[#1E3A2F] text-[#FDF8F2] border-[#1E3A2F] dark:bg-amber-600 dark:text-[#120D08] dark:border-amber-500'
                            : isTrial
                              ? 'bg-amber-100/80 border-amber-500/75 hover:bg-amber-200/80 dark:bg-amber-950/35 dark:border-amber-500/50 dark:hover:bg-amber-900/40'
                              : 'bg-[#FAF5EC] border-[#D4C0A3] hover:bg-[#F3E9D8] dark:bg-[#221A14] dark:border-[#3A2B1F] dark:hover:bg-[#2A2019]'
                      }`}
                    >
                      <span className="font-mono-num">
                        {locked ? <Lock className="w-3 h-3" /> : `Lv ${lvl}`}
                      </span>
                      {!locked && (
                        <span
                          aria-hidden="true"
                          className="text-[10px] leading-none mt-0.5 inline-flex items-center"
                        >
                          {stars > 0 && (
                            <span
                              className={
                                active
                                  ? 'text-amber-300'
                                  : 'text-amber-500 dark:text-amber-300'
                              }
                            >
                              {'★'.repeat(stars)}
                            </span>
                          )}
                          {stars < 3 && (
                            <span
                              className={
                                active
                                  ? 'text-[#FDF8F2]/35 dark:text-[#120D08]/40'
                                  : 'text-[#8C7760]/45 dark:text-[#A4907B]/35'
                              }
                            >
                              {'☆'.repeat(Math.max(0, 3 - stars))}
                            </span>
                          )}
                        </span>
                      )}
                      {isTrial && (
                        <span className="text-[9px] font-bold leading-none mt-0.5 text-amber-800 dark:text-amber-300">
                          2×★
                        </span>
                      )}
                      {!isTrial && isBloom && (
                        <span className="text-[9px] font-bold leading-none mt-0.5 text-emerald-700 dark:text-emerald-300">
                          Bloom
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedMode === 'duel' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="font-display text-lg font-bold">
                  Friend Duel · Same Starting Board &amp; Seed
                </h2>
                <span className="font-mono-num text-xs text-[#6E5A46] dark:text-[#B4A08A]">
                  Best {duelBestScore.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#5C4936] dark:text-[#C4B29D] mb-3">
                Same starting board &amp; seed — share a seed code or link so you and a friend play this same board offline at your own pace.
              </p>

              <div className="flex items-center gap-2 mb-2.5">
                <input
                  type="text"
                  value={seedCode}
                  maxLength={16}
                  data-testid="duel-seed-input"
                  onChange={(e) => onSeedChange(e.target.value.toUpperCase())}
                  aria-label="Friend Duel seed code"
                  className="flex-1 min-h-[44px] px-3 rounded-xl font-mono-num text-sm font-bold tracking-wider border
                    bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F]
                    dark:bg-[#110D0A] dark:border-[#3A2B1F] dark:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-500"
                />
                <button
                  type="button"
                  onClick={() => onSeedChange(generateSeedCode())}
                  aria-label="Generate random seed code"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border bg-[#FAF5EC] border-[#C9B292] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3A2B1F] dark:hover:bg-[#2C221A]"
                >
                  <Dices className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  data-testid="copy-duel-link-btn"
                  onClick={handleCopyDuel}
                  aria-label="Play this same board — copy link"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border bg-[#FAF5EC] border-[#C9B292] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3A2B1F] dark:hover:bg-[#2C221A] whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Play this same board</span>
                    </>
                  )}
                </button>
              </div>

              {copyFallbackText && (
                <div className="mb-2.5">
                  <label className="block text-[11px] font-semibold text-[#6E5A46] dark:text-[#B4A08A] mb-1">
                    Select &amp; copy board link:
                  </label>
                  <input
                    type="text"
                    readOnly
                    data-testid="title-copy-fallback-input"
                    value={copyFallbackText}
                    onFocus={(e) => e.currentTarget.select()}
                    onClick={(e) => e.currentTarget.select()}
                    aria-label="Selectable Friend Duel URL"
                    className="w-full min-h-[36px] px-2.5 py-1 rounded-lg font-mono-num text-xs border bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] dark:bg-[#1F1812] dark:border-[#4A3828] dark:text-amber-200"
                  />
                </div>
              )}

              <div className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
                Layout for{' '}
                <span className="font-mono-num font-semibold">
                  {normalizeSeedCode(seedCode)}
                </span>
                :{' '}
                <span className="font-semibold text-[#2A1F15] dark:text-amber-200">
                  {BOARD_SHAPE_META[duelPreview.boardShape].name}
                </span>
              </div>
            </div>
          )}

          {selectedMode === 'zen' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="font-display text-lg font-bold">
                  Endless Zen Courtyard
                </h2>
                <span className="font-mono-num text-xs font-semibold text-[#1E3A2F] dark:text-amber-300">
                  Best {bestScore.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#5C4936] dark:text-[#C4B29D] leading-relaxed">
                Classic open 8×8 wooden grid with solver-checked trays, Cozy Pocket reserve, Combo-Earned Rotation, and Tactical Undo.
              </p>
            </div>
          )}
        </div>

        {/* Primary Action CTAs + Daily Haven Puzzle */}
        <div className="flex flex-col gap-2 w-full max-w-md">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full">
            {hasSavedRun ? (
              <>
                <button
                  type="button"
                  data-start="true"
                  onClick={onResumeRun}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 min-h-[46px] sm:min-h-[48px] px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-sm text-[#FDF8F2] transition-transform active:scale-[0.98]
                    bg-[#1E3A2F] hover:bg-[#274C3D] shadow-md dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume ({savedRunLabel})</span>
                </button>
                <button
                  type="button"
                  onClick={onStartNewRun}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[48px] px-5 py-2 sm:py-3 rounded-xl font-semibold text-sm border transition-colors
                    bg-[#EFE4D2] border-[#C9B292] text-[#2A1F15] hover:bg-[#E5D4BA]
                    dark:bg-[#1B1510] dark:border-[#3D2E22] dark:text-[#F5EDE1] dark:hover:bg-[#261D16]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {selectedMode === 'story'
                      ? `Start Story (Lv ${selectedLevel})`
                      : selectedMode === 'duel'
                        ? 'Play Same Board'
                        : 'New Zen'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onStartNewRun}
                className="w-full inline-flex items-center justify-center gap-2.5 min-h-[48px] sm:min-h-[50px] px-8 py-3 rounded-xl font-semibold text-base text-[#FDF8F2] transition-transform active:scale-[0.98]
                  bg-[#1E3A2F] hover:bg-[#274C3D] shadow-md dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {selectedMode === 'story'
                    ? selectedLevel === 1 && unlockedLevel === 1
                      ? 'Start Story · Level 1'
                      : `Start Story · Level ${selectedLevel}`
                    : selectedMode === 'duel'
                      ? `Play This Same Board (${normalizeSeedCode(seedCode)})`
                      : 'Play Endless Zen'}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="daily-puzzle-btn"
            onClick={onStartDailyPuzzle}
            className="w-full inline-flex flex-wrap items-center justify-center gap-2 min-h-[40px] sm:min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors
              bg-[#EFE4D2] border-[#C9B292] text-[#1E3A2F] hover:bg-[#E5D4BA]
              dark:bg-[#191410] dark:border-[#3A2B1F] dark:text-amber-300 dark:hover:bg-[#241C16]"
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Daily Haven Puzzle ({todayKey})</span>
            {dailyCompletedToday ? (
              <span
                data-testid="daily-completed-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-400/70 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/50"
              >
                <Check className="w-3 h-3" />
                <span>
                  Completed Today
                  {dailyBestScore > 0
                    ? ` · Best ${dailyBestScore.toLocaleString()}`
                    : ''}
                </span>
              </span>
            ) : (
              <span
                data-testid="daily-reward-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-400/70 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-400/50"
              >
                <Gem className="w-2.5 h-2.5" />
                <span>+10 Gems</span>
              </span>
            )}
          </button>
        </div>
        </div>

        {/* Bottom control hint & Play Store Privacy Link */}
        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-[#7C6752] dark:text-[#9D8A76] text-center pb-0.5">
          <span className="hidden sm:inline">Drag or Tap to Place · R Rotate · Z Undo · P Pause</span>
          <span className="sm:hidden">Drag or Tap to Place · R Rotate</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            data-testid="title-privacy-link"
            onClick={onOpenPrivacyTerms}
            className="underline hover:text-[#2A1F15] dark:hover:text-[#F5EDE1] min-h-[28px]"
          >
            Privacy &amp; Terms
          </button>
        </footer>
      </div>
    </main>
  );
};
