import { ENABLE_FULL_META } from '../game/features';
import React, { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Film,
  HelpCircle,
  Home,
  Moon,
  Play,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
  Star,
  Sun,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  formatDailyShareCard,
  getSharePlayUrl,
  isDailyPuzzleSeed,
  isNativePlatform,
} from '../game/monetization';
import type { RunStats } from '../game/types';

export const VISUAL_THEMES = [
  { id: 'midnight', name: 'Midnight Jewel', color: '#6366F1' },
  { id: 'royal', name: 'Royal', color: '#C026D3' },
  { id: 'emerald', name: 'Emerald', color: '#10B981' },
  { id: 'sunset', name: 'Sunset', color: '#FB7185' },
  { id: 'classic', name: 'Classic', color: '#E7D8C0' },
] as const;
export type VisualTheme = typeof VISUAL_THEMES[number]['id'];

interface PauseModalProps {
  stats: RunStats;
  visualTheme: VisualTheme;
  tip?: string;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onBackToTitle: () => void;
  onSelectTheme: (theme: VisualTheme) => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ stats, visualTheme, tip, muted, onResume, onRestart, onBackToTitle, onSelectTheme, onToggleMute }) => (
  <div role="dialog" aria-modal="true" aria-label="Pause Menu" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
    <div className="game-panel w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border p-5 shadow-2xl">
      <h2 className="text-center text-2xl font-black">Pause Menu</h2>
      <p className="mt-1 mb-4 text-center text-xs opacity-75">{stats.levelTitle} · {stats.score.toLocaleString()} points</p>
      <div className="flex flex-col gap-3">
        <button autoFocus type="button" onClick={onResume} className="game-button game-resume flex min-h-12 items-center justify-center gap-2 rounded-2xl"><Play className="size-5" />Resume</button>
        <button type="button" onClick={onRestart} className="game-button flex min-h-12 items-center justify-center gap-2 rounded-2xl"><RotateCcw className="size-5" />Replay</button>
        <fieldset className="rounded-2xl border border-current/20 p-3">
          <legend className="px-2 text-xs font-bold">Theme · {VISUAL_THEMES.find(t => t.id === visualTheme)?.name}</legend>
          <div className="flex justify-between gap-2">
            {VISUAL_THEMES.map(theme => <button key={theme.id} type="button" aria-label={theme.name} aria-pressed={visualTheme === theme.id} onClick={() => onSelectTheme(theme.id)} className="grid size-10 place-items-center rounded-full border-2 border-white/40 shadow-md" style={{ background: theme.color, outline: visualTheme === theme.id ? '3px solid var(--game-text)' : undefined, outlineOffset: 2 }}>{visualTheme === theme.id && <Check className="size-5 text-white" />}</button>)}
          </div>
        </fieldset>
        <button type="button" onClick={onToggleMute} aria-pressed={!muted} className="game-button flex min-h-12 items-center justify-center gap-2 rounded-2xl">{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}Sound {muted ? 'Off' : 'On'}</button>
        <button type="button" onClick={onBackToTitle} className="game-button flex min-h-12 items-center justify-center gap-2 rounded-2xl"><Home className="size-5" />Exit to Menu</button>
      </div>
      <details className="mt-4 text-xs opacity-75"><summary className="cursor-pointer font-bold">Run info</summary><p className="mt-2">Fair-Play Seed · {stats.seedCode}</p><p>{stats.linesCleared} lines cleared</p>{tip && <p className="mt-2">{tip}</p>}<p>Daily milestones: 1,500+ points and beyond. Progress is kept during this run.</p></details>
    </div>
  </div>
);

interface LeaveMatchModalProps {
  stats: RunStats;
  onKeepPlaying: () => void;
  onLeaveToTitle: () => void;
}

export const LeaveMatchModal: React.FC<LeaveMatchModalProps> = ({
  stats,
  onKeepPlaying,
  onLeaveToTitle,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause or Leave Match Confirmation"
      data-testid="leave-match-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onKeepPlaying();
      }}
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#6E5A46] dark:text-amber-300/80 mb-1">
          {stats.levelTitle}
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">
          Pause / Leave Match?
        </h2>
        <p className="text-xs text-[#5C4936] dark:text-[#C4B29D] mb-5 leading-relaxed">
          Your current board ({stats.score.toLocaleString()} pts) is saved
          automatically if you return to the Title Screen.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-testid="leave-match-resume-btn"
            onClick={onKeepPlaying}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Keep Playing</span>
          </button>
          <button
            type="button"
            data-testid="leave-match-confirm-btn"
            onClick={onLeaveToTitle}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
          >
            <Home className="w-4 h-4" />
            <span>Leave Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  stats: RunStats;
  noAdsOwned: boolean;
  starsDoubled: boolean;
  seedPackAwarded?: boolean;
  onDoubleStars: () => void;
  onNextLevel: () => void;
  onVisitHaven: () => void;
  onReplay: () => void;
  onBackToTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  noAdsOwned,
  starsDoubled,
  seedPackAwarded = false,
  onDoubleStars,
  onNextLevel,
  onVisitHaven,
  onReplay,
  onBackToTitle,
}) => {
  const isNative = isNativePlatform();
  const starMult = stats.starMultiplier > 1 ? stats.starMultiplier : 1;
  const baseStars = stats.starsAwarded * starMult + stats.bonusStarsEarned;
  const totalStars = starsDoubled ? baseStars * 2 : baseStars;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level Complete"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="text-center mb-4">
          <div className="text-xs font-semibold tracking-wide text-emerald-700 dark:text-amber-400 mb-1">
            Level {stats.levelNumber} Complete
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {stats.levelTitle}
          </h2>
          {starMult > 1 && (
            <div className="inline-block mb-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-500/70 bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200">
              Master Artisan Trial · {starMult}× ★ Applied!
            </div>
          )}

          {/* Cozy Stars Row */}
          <div className="flex items-center justify-center gap-2 mb-1">
            {[1, 2, 3].map((idx) => (
              <Star
                key={idx}
                className={`w-8 h-8 transition-transform ${
                  idx <= stats.starsAwarded
                    ? 'text-amber-500 fill-amber-400 scale-105'
                    : 'text-[#D4C0A3] dark:text-[#3D2E22]'
                }`}
              />
            ))}
          </div>
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            +{totalStars} Cozy Star{totalStars === 1 ? '' : 's'} Earned
            {stats.bonusStarsEarned > 0 &&
              ` (includes +${stats.bonusStarsEarned} Bloom Bonus)`}
          </div>
          {(stats.gemsAwarded ?? 0) > 0 && (
            <div
              data-testid="victory-gems-awarded"
              className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-sky-400/60 bg-sky-100/90 text-sky-900 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-200"
            >
              <span>💎 +{stats.gemsAwarded} Cozy Gems Earned</span>
            </div>
          )}
          {seedPackAwarded && (
            <div
              data-testid="victory-seed-pack-awarded"
              className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/50 bg-emerald-100/80 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              Seed Pack Earned! Open in My Haven → Herbarium
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Score
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Moves
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.movesPlaced}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Lines
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.linesCleared}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onNextLevel}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            <span>Next Level (Lv {stats.levelNumber + 1})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!starsDoubled && (isNative || noAdsOwned) && (
            <button
              type="button"
              data-testid="ad-double-stars"
              onClick={onDoubleStars}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[#EFE4D2] border-[#C9B292] text-[#2A1F15] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:text-amber-200 dark:hover:bg-[#2E241C]"
            >
              {noAdsOwned ? (
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Film className="w-4 h-4 text-[#6E5A46] dark:text-amber-300" />
              )}
              <span>
                {noAdsOwned
                  ? `Claim 2× Cozy Stars (+${baseStars}★ VIP)`
                  : `Watch Ad: 2× Cozy Stars (+${baseStars}★)`}
              </span>
            </button>
          )}
          <button
            type="button"
            data-testid="visit-haven-from-victory"
            onClick={onVisitHaven}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border border-amber-500/60 bg-amber-100/80 text-amber-950 hover:bg-amber-200/80 dark:bg-amber-500/20 dark:border-amber-400/50 dark:text-amber-200 dark:hover:bg-amber-500/30"
          >
            <Home className="w-4 h-4" />
            <span>Visit My Haven</span>
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Level</span>
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#6E5A46] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]"
          >
            <Home className="w-4 h-4" />
            <span>Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  stats: RunStats;
  canRevive: boolean;
  reviveStatus: string | null;
  onViewBoard: () => void;
  canUndoRescue: boolean;
  noAdsOwned: boolean;
  isNewBest: boolean;
  lostStreakCount?: number;
  canDoubleDailyBest: boolean;
  dailyBonusDoubled: boolean;
  onDoubleDailyBest: () => void;
  onReviveClear3x3: () => void;
  onUndoRescue: () => void;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  canRevive,
  reviveStatus,
  onViewBoard,
  canUndoRescue,
  noAdsOwned,
  isNewBest,
  lostStreakCount = 0,
  canDoubleDailyBest,
  dailyBonusDoubled,
  onDoubleDailyBest,
  onReviveClear3x3,
  onUndoRescue,
  onPlayAgain,
  onBackToTitle,
}) => {
  const isNative = isNativePlatform();
  const [copied, setCopied] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);

  const shareUrl = getSharePlayUrl(stats.seedCode);

  const spoilerFreeCard = formatDailyShareCard({
    seedCode: stats.seedCode,
    score: stats.score,
    linesCleared: stats.linesCleared,
    bestCombo: stats.bestCombo,
    playUrl: shareUrl,
  });

  const canUseNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyChallenge = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      setCopyFallbackText(shareUrl ?? spoilerFreeCard);
      return;
    }
    try {
      await navigator.clipboard.writeText(spoilerFreeCard);
      setCopied(true);
      setCopyFallbackText(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyFallbackText(shareUrl ?? spoilerFreeCard);
    }
  };

  const handleNativeShare = async () => {
    if (!canUseNativeShare) {
      await handleCopyChallenge();
      return;
    }
    try {
      const shareData: ShareData = {
        title: isDailyPuzzleSeed(stats.seedCode)
          ? 'HavenBlocks Daily Result'
          : 'HavenBlocks Same-Board Challenge',
        text: spoilerFreeCard,
      };
      if (shareUrl) shareData.url = shareUrl;
      await navigator.share(shareData);
    } catch {
      await handleCopyChallenge();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Out of Moves"
      className="overlay-safe-area fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="gameover-panel overflow-wrap-anywhere w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-4 min-[380px]:p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="gameover-header mb-4">
          <div className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400 mb-1">
            {isDailyPuzzleSeed(stats.seedCode)
              ? `Daily Haven Puzzle · ${stats.seedCode.replace(/^DAILY-/, '')}`
              : stats.mode === 'duel'
                ? `Same Starting Board & Seed · ${stats.seedCode}`
                : isNewBest
                  ? 'New Best Score'
                  : 'Board Full'}
          </div>
          <h2 className="gameover-title font-display text-2xl font-bold">No Valid Moves Left</h2>
          {ENABLE_FULL_META && (stats.gemsAwarded ?? 0) > 0 && (
            <div
              data-testid="daily-gems-awarded"
              className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-sky-400/60 bg-sky-100/90 text-sky-900 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-200"
            >
              <span>💎 +{stats.gemsAwarded} Daily Cozy Gems Earned!</span>
            </div>
          )}
          {lostStreakCount > 0 && (isNative || noAdsOwned) && (
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              Revive to keep your {lostStreakCount}/5 Firefly Lantern streak!
            </p>
          )}
        </div>

        <div className="gameover-stats grid grid-cols-3 gap-2 mb-4">
          <div className="gameover-stat p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Score
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="gameover-stat p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Best
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.bestScore.toLocaleString()}
            </div>
          </div>
          <div className="gameover-stat p-3 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16]">
            <div className="text-[11px] font-medium text-[#6E5A46] dark:text-[#B4A08A]">
              Lines
            </div>
            <div className="font-mono-num text-base font-bold">
              {stats.linesCleared}
            </div>
          </div>
        </div>

        {/* Spoiler-free Result Card for Daily Haven Puzzle & Seed Duels */}
        {stats.mode === 'duel' && (
          <div
            data-testid="daily-result-card"
            className="gameover-card rounded-xl p-3 mb-4 border text-left bg-[#EFE4D2] border-[#C9B292] dark:bg-[#14100C] dark:border-[#3A2B1F]"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E5A46] dark:text-amber-300/80 mb-1">
              Spoiler-Free Result Card
            </div>
            <pre className="font-mono-num text-[11px] min-[380px]:text-xs whitespace-pre-wrap break-all [overflow-wrap:anywhere] text-[#2A1F15] dark:text-[#F5EDE1]">
              {spoilerFreeCard}
            </pre>
            {copyFallbackText && (
              <div className="mt-2">
                <input
                  type="text"
                  readOnly
                  data-testid="gameover-copy-fallback-input"
                  value={copyFallbackText}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  aria-label="Selectable board challenge URL"
                  className="w-full min-h-[34px] px-2 py-1 rounded-lg font-mono-num text-xs border bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] dark:bg-[#221A14] dark:border-[#4A3828] dark:text-amber-200"
                />
              </div>
            )}
          </div>
        )}

        <div className="gameover-actions flex flex-col gap-2.5">
          <button type="button" onClick={onViewBoard} className="gameover-action rounded-xl border border-current/30 min-h-[44px] font-semibold">View Board</button>
          {reviveStatus && <p role="status" className="text-xs overflow-wrap-anywhere">{reviveStatus}</p>}
          {canRevive && (
            <button
              type="button"
              data-testid="ad-revive-3x3"
              onClick={onReviveClear3x3}
              className="gameover-action w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm border border-amber-500/70 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-500/20 dark:border-amber-400/60 dark:text-amber-200 dark:hover:bg-amber-500/30"
            >
              {noAdsOwned ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Film className="w-4 h-4" />
              )}
              <span>
                {noAdsOwned
                  ? lostStreakCount > 0
                    ? `Clear 3×3 & Save ${lostStreakCount}/5 Streak (VIP)`
                    : 'Clear 3×3 & Revive (VIP)'
                  : lostStreakCount > 0
                    ? `Watch Ad: Clear 3×3 & Save Streak`
                    : 'Watch Ad: Clear 3×3 & Continue'}
              </span>
            </button>
          )}
          {canUndoRescue && (
            <button
              type="button"
              onClick={onUndoRescue}
              className="gameover-action w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
            >
              <Undo2 className="w-4 h-4" />
              <span>Use Tactical Undo</span>
            </button>
          )}
          {isDailyPuzzleSeed(stats.seedCode) && stats.mode === 'duel' && stats.score >= 1500 && !dailyBonusDoubled && (
            <button
              type="button"
              data-testid="ad-daily-double"
              onClick={onDoubleDailyBest}
              disabled={!canDoubleDailyBest}
              className="gameover-action w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm border border-amber-500/70 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-500/20 dark:border-amber-400/60 dark:text-amber-200 dark:hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {noAdsOwned ? <Sparkles className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span>{noAdsOwned ? 'Claim 2× Daily Best' : 'Watch Ad: 2× Daily Best'}</span>
            </button>
          )}
          {isDailyPuzzleSeed(stats.seedCode) && stats.mode === 'duel' && dailyBonusDoubled && (
            <p data-testid="daily-bonus-doubled" role="status" className="text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">2× Daily Best recorded ✓</p>
          )}
          {stats.mode === 'duel' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="gameover-copy-challenge-btn"
                onClick={handleCopyChallenge}
                className="gameover-action flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{shareUrl ? 'Play this same board · Copy Link' : 'Copy Spoiler-Free Result'}</span>
                  </>
                )}
              </button>
              {canUseNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  aria-label="Share result card"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22]"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="gameover-action w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="gameover-action w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#6E5A46] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]"
          >
            <Home className="w-4 h-4" />
            <span>Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to Play HavenBlocks"
      data-testid="help-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-md rounded-2xl p-5 sm:p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400 mb-0.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Cozy Tactical Guide</span>
            </div>
            <h2 className="font-display text-xl font-bold">
              How to Play HavenBlocks
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-help-modal-btn"
            onClick={onClose}
            aria-label="Close help guide"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-[#4D3B2A] dark:text-[#D7C7B4] mb-5">
          <div className="p-3 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#241C16] dark:border-[#3A2B1F]">
            <div className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-0.5">
              1. Place &amp; Clear Full Lines
            </div>
            <p>
              Drag any piece from the bottom tray (or tap a piece, then tap a
              board square) to complete full 8-tile rows or columns.
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#241C16] dark:border-[#3A2B1F] flex items-start gap-2.5">
            <Bookmark className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" />
            <div>
              <div className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-0.5">
                Cozy Pocket (Reserve Slot)
              </div>
              <p>
                Tap the Pocket button to stash a tricky piece for later and free
                up your tray.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#241C16] dark:border-[#3A2B1F] flex items-start gap-2.5">
            <RotateCw className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-300 mt-0.5" />
            <div>
              <div className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-0.5">
                Rotate (Key: R) &amp; Undo (Key: Z)
              </div>
              <p>
                Start with one Spin and one Undo. Pocket swaps rest for two placements. Optional rewarded ads can refill your tools when a provider is available.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
        >
          Back to Puzzle
        </button>
      </div>
    </div>
  );
};
