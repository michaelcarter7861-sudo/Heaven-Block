import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gem,
  Heart,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  buildDailyCalendarMonth,
  evaluateMilestones,
  filterMilestonesByCategory,
  getBestFireflyStreak,
  getUnlockedHavenMemories,
  MONTHLY_TROPHY_THRESHOLDS,
  summarizeMilestoneBadges,
  type MilestoneCategory,
  type MilestoneProgressContext,
} from '../game/journal';
import { getTodayDateKey } from '../game/monetization';
import type { JournalTabId } from '../game/types';
import { MilestoneBadge } from './MilestoneBadge';

interface JournalModalProps {
  initialTab?: JournalTabId;
  context: MilestoneProgressContext;
  claimedMilestones: string[];
  dailyBestScore: number;
  onClaimMilestone: (milestoneId: string) => { ok: boolean; message: string };
  onPlayDailyToday: () => void;
  onClose: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const JournalModal: React.FC<JournalModalProps> = ({
  initialTab = 'calendar',
  context,
  claimedMilestones,
  dailyBestScore,
  onClaimMilestone,
  onPlayDailyToday,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<JournalTabId>(initialTab);
  const [milestoneFilter, setMilestoneFilter] = useState<
    'all' | MilestoneCategory
  >('all');
  const [focusedBadgeId, setFocusedBadgeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const todayKey = useMemo(() => getTodayDateKey(), []);
  const nowDate = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(nowDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(nowDate.getMonth());

  const calendar = useMemo(
    () =>
      buildDailyCalendarMonth(
        viewYear,
        viewMonth,
        context.completedDailyDates,
        todayKey
      ),
    [viewYear, viewMonth, context.completedDailyDates, todayKey]
  );

  const milestones = useMemo(
    () => evaluateMilestones(context, claimedMilestones),
    [context, claimedMilestones]
  );
  const badgeSummary = useMemo(
    () => summarizeMilestoneBadges(milestones),
    [milestones]
  );
  const visibleMilestones = useMemo(
    () => filterMilestonesByCategory(milestones, milestoneFilter),
    [milestones, milestoneFilter]
  );
  const claimableCount = badgeSummary.claimable;
  const bestStreak = useMemo(() => getBestFireflyStreak(context), [context]);

  const memories = useMemo(
    () => getUnlockedHavenMemories(context.haven),
    [context.haven]
  );

  const todayCompleted = context.completedDailyDates.includes(todayKey);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleClaim = (milestoneId: string) => {
    const res = onClaimMilestone(milestoneId);
    setFeedback(res.message);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cozy Journal, Daily Calendar and Milestones"
      data-testid="journal-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65"
    >
      <div className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border shadow-2xl overflow-hidden bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3 border-b border-[#E2D2B8] dark:border-[#2F241B]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cozy Haven Journal</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold">
              Calendar, Milestones &amp; Memories
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-journal-btn"
            onClick={onClose}
            aria-label="Close Cozy Journal"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Tab Bar */}
        <div
          role="tablist"
          aria-label="Journal sections"
          className="grid grid-cols-3 gap-1 p-1.5 mx-4 sm:mx-5 mt-3 rounded-xl bg-[#EADCC5] dark:bg-[#120E0B]"
        >
          {(
            [
              {
                id: 'calendar',
                label: 'Daily Calendar',
                shortLabel: 'Calendar',
                icon: Calendar,
              },
              {
                id: 'milestones',
                label: 'Milestones',
                shortLabel: 'Milestones',
                icon: Trophy,
              },
              {
                id: 'memories',
                label: 'Memories',
                shortLabel: 'Memories',
                icon: Heart,
              },
            ] as const
          ).map(({ id, label, shortLabel, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`journal-tab-${id}`}
                onClick={() => {
                  setActiveTab(id);
                  setFeedback(null);
                }}
                className={`relative inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-[38px] px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#1E3A2F] text-[#FDF8F2] shadow-sm dark:bg-amber-600 dark:text-[#120D08]'
                    : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline truncate">{label}</span>
                {id === 'milestones' && claimableCount > 0 && (
                  <span
                    data-testid="journal-claimable-count"
                    className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-300 text-amber-950 shrink-0"
                  >
                    {claimableCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            data-testid="journal-feedback"
            className="mx-4 sm:mx-5 mt-2.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-500/50 bg-emerald-100/85 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-200"
          >
            {feedback}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          {activeTab === 'calendar' && (
            <div data-testid="journal-panel-calendar" className="space-y-3.5">
              {/* Monthly Trophy Progress Card */}
              <div className="rounded-2xl p-3.5 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Award
                      className={`w-5 h-5 ${
                        calendar.trophyTier === 'gold'
                          ? 'text-amber-500'
                          : calendar.trophyTier === 'silver'
                            ? 'text-slate-400'
                            : calendar.trophyTier === 'bronze'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-[#8C7760]'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold">
                        {calendar.trophyTier === 'gold'
                          ? 'Gold Conservatory Crown Unlocked!'
                          : calendar.trophyTier === 'silver'
                            ? 'Silver Lantern Trophy Active'
                            : calendar.trophyTier === 'bronze'
                              ? 'Bronze Leaf Trophy Active'
                              : 'Monthly Cozy Trophy'}
                      </div>
                      <div className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
                        {calendar.nextTrophyTarget
                          ? `${calendar.completedCountThisMonth}/${calendar.nextTrophyTarget} days toward ${calendar.nextTrophyLabel} (no streak resets)`
                          : `${calendar.completedCountThisMonth} Daily Boards finished this month!`}
                      </div>
                    </div>
                  </div>
                  {dailyBestScore > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase text-[#6E5A46] dark:text-[#A4907B]">
                        Daily Best
                      </div>
                      <div className="font-mono-num text-xs font-bold text-[#1E3A2F] dark:text-amber-300">
                        {dailyBestScore.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trophy Milestone Bar */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      {
                        tier: 'Bronze',
                        days: MONTHLY_TROPHY_THRESHOLDS.bronze,
                        reached:
                          calendar.completedCountThisMonth >=
                          MONTHLY_TROPHY_THRESHOLDS.bronze,
                      },
                      {
                        tier: 'Silver',
                        days: MONTHLY_TROPHY_THRESHOLDS.silver,
                        reached:
                          calendar.completedCountThisMonth >=
                          MONTHLY_TROPHY_THRESHOLDS.silver,
                      },
                      {
                        tier: 'Gold',
                        days: MONTHLY_TROPHY_THRESHOLDS.gold,
                        reached:
                          calendar.completedCountThisMonth >=
                          MONTHLY_TROPHY_THRESHOLDS.gold,
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.tier}
                      className={`rounded-xl py-1.5 px-2 border text-[11px] font-semibold ${
                        item.reached
                          ? 'bg-amber-100/90 border-amber-500/70 text-amber-950 dark:bg-amber-500/20 dark:border-amber-400/50 dark:text-amber-200'
                          : 'bg-[#FAF5EC] border-[#D4C0A3] text-[#7A654F] dark:bg-[#15110D] dark:border-[#30241A] dark:text-[#9D8A76]'
                      }`}
                    >
                      {item.tier} · {item.days}d {item.reached ? '✓' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Month Navigation + Grid */}
              <div className="rounded-2xl p-3.5 border bg-[#F5ECDE] border-[#D4C0A3] dark:bg-[#15110D] dark:border-[#34261B]">
                <div className="flex items-center justify-between mb-2.5">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border bg-[#FAF5EC] border-[#D4C0A3] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div
                    data-testid="calendar-month-label"
                    className="font-display text-sm font-bold"
                  >
                    {calendar.monthLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border bg-[#FAF5EC] border-[#D4C0A3] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-[10px] font-bold uppercase text-[#7A654F] dark:text-[#9D8A76]"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendar.leadingEmptyCells }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-9" />
                  ))}
                  {calendar.days.map((cell) => (
                    <div
                      key={cell.dateKey}
                      data-testid={
                        cell.isToday ? 'calendar-today-cell' : undefined
                      }
                      data-completed={cell.completed ? 'true' : 'false'}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs font-mono-num border ${
                        cell.completed
                          ? 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/85 dark:text-[#0B140E] dark:border-emerald-400 font-bold'
                          : cell.isToday
                            ? 'bg-amber-100 text-amber-950 border-amber-500 font-bold dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400'
                            : cell.isFuture
                              ? 'bg-transparent border-transparent text-[#A89681] dark:text-[#57493C]'
                              : 'bg-[#FAF5EC] border-[#DFCFAF] text-[#5C4936] dark:bg-[#1E1712] dark:border-[#2E2218] dark:text-[#B4A08A]'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                data-testid="journal-play-daily-btn"
                onClick={() => {
                  onClose();
                  onPlayDailyToday();
                }}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {todayCompleted
                    ? `Replay Today's Daily Board (${todayKey})`
                    : `Play Today's Daily Board (+10 Gems)`}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div data-testid="journal-panel-milestones" className="space-y-3.5">
              {/* Haven Milestones Badge Case Header */}
              <div className="rounded-2xl p-3.5 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-amber-400">
                      <Award className="w-3.5 h-3.5" />
                      <span>Collectible Badge Case</span>
                    </div>
                    <h3 className="font-display text-base font-bold leading-tight">
                      Haven Milestones
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      data-testid="milestone-badge-progress"
                      className="font-mono-num text-xs font-bold text-[#1E3A2F] dark:text-amber-300"
                    >
                      {badgeSummary.unlocked}/{badgeSummary.total} Earned
                    </div>
                    <div className="text-[10px] text-[#6E5A46] dark:text-[#A4907B]">
                      {badgeSummary.claimed} Collected · {badgeSummary.completionPct}%
                    </div>
                  </div>
                </div>

                {/* Badge Completion Bar */}
                <div className="h-2 w-full rounded-full overflow-hidden bg-[#DAC7AA] dark:bg-[#120E0B] mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1E3A2F] to-emerald-600 dark:from-amber-600 dark:to-amber-400 transition-all duration-300"
                    style={{ width: `${badgeSummary.completionPct}%` }}
                  />
                </div>

                {/* Collectible Medallion Showcase Grid */}
                <div
                  data-testid="milestone-badge-cabinet"
                  className="grid grid-cols-4 sm:grid-cols-5 gap-2 py-2 px-1.5 rounded-xl bg-[#FAF5EC]/80 border border-[#DFCFAF] dark:bg-[#14100C] dark:border-[#2F241B]"
                >
                  {milestones.map((m) => {
                    const isFocused = focusedBadgeId === m.def.id;
                    return (
                      <button
                        key={m.def.id}
                        type="button"
                        data-testid={`badge-tile-${m.def.id}`}
                        onClick={() => {
                          setFocusedBadgeId(m.def.id);
                          setMilestoneFilter('all');
                          if (m.claimable) {
                            handleClaim(m.def.id);
                          }
                        }}
                        title={`${m.def.title} — ${Math.min(m.current, m.target)}/${m.target}`}
                        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors ${
                          isFocused
                            ? 'bg-amber-100/90 ring-1 ring-[#1E3A2F] dark:bg-amber-500/15 dark:ring-amber-400'
                            : 'hover:bg-[#EFE4D2]/80 dark:hover:bg-[#1E1712]'
                        }`}
                      >
                        <MilestoneBadge
                          icon={m.def.badgeIcon}
                          tier={m.def.badgeTier}
                          label={m.def.badgeLabel}
                          progressPct={m.progressPct}
                          unlocked={m.completed}
                          claimed={m.claimed}
                          claimable={m.claimable}
                          size="sm"
                        />
                        <span className="mt-1 text-[9px] font-bold leading-tight text-center text-[#4D3B2A] dark:text-[#CBBAA6] truncate max-w-full">
                          {m.def.badgeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lifetime Gameplay Feats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                  <div className="text-[10px] font-semibold uppercase text-[#6E5A46] dark:text-[#A4907B]">
                    Lines Cleared
                  </div>
                  <div className="font-mono-num text-base font-bold">
                    {context.lifetimeStats.totalLinesCleared.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                  <div className="text-[10px] font-semibold uppercase text-[#6E5A46] dark:text-[#A4907B]">
                    Best Streak
                  </div>
                  <div
                    data-testid="milestone-best-streak-stat"
                    className="font-mono-num text-base font-bold inline-flex items-center gap-1 text-[#1E3A2F] dark:text-amber-300"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {bestStreak}/5
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                  <div className="text-[10px] font-semibold uppercase text-[#6E5A46] dark:text-[#A4907B]">
                    Best Combo
                  </div>
                  <div className="font-mono-num text-base font-bold inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {Math.max(1, context.lifetimeStats.highestComboEver)}×
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                  <div className="text-[10px] font-semibold uppercase text-[#6E5A46] dark:text-[#A4907B]">
                    Daily Boards
                  </div>
                  <div className="font-mono-num text-base font-bold">
                    {context.completedDailyDates.length}
                  </div>
                </div>
              </div>

              {/* Category Filter Strip */}
              <div
                role="group"
                aria-label="Filter Haven Milestones by category"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    { id: 'all', label: `All (${milestones.length})` },
                    { id: 'gameplay', label: 'Gameplay Feats' },
                    { id: 'haven', label: 'Cozy Haven' },
                    { id: 'collection', label: 'Daily & Cards' },
                  ] as const
                ).map((cat) => {
                  const active = milestoneFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      data-testid={`milestone-filter-${cat.id}`}
                      onClick={() => setMilestoneFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        active
                          ? 'bg-[#1E3A2F] text-[#FDF8F2] border-[#1E3A2F] dark:bg-amber-600 dark:text-[#120D08] dark:border-amber-500'
                          : 'bg-[#FAF5EC] text-[#5C4936] border-[#D4C0A3] hover:bg-[#EFE4D2] dark:bg-[#17120E] dark:text-[#B4A08A] dark:border-[#3A2B1F]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Detailed Haven Milestones Achievement Cards */}
              <div className="space-y-2">
                {visibleMilestones.map((m) => {
                  const isFocused = focusedBadgeId === m.def.id;
                  return (
                    <div
                      key={m.def.id}
                      data-testid={`milestone-${m.def.id}`}
                      className={`rounded-xl p-3 border flex items-center gap-3 transition-colors ${
                        isFocused
                          ? 'bg-amber-50/95 border-amber-500 ring-1 ring-amber-400/70 dark:bg-[#261D14] dark:border-amber-400/70'
                          : m.claimable
                            ? 'bg-[#F5EBD6] border-amber-500/70 dark:bg-[#241B12] dark:border-amber-500/50'
                            : 'bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]'
                      }`}
                    >
                      <MilestoneBadge
                        icon={m.def.badgeIcon}
                        tier={m.def.badgeTier}
                        label={m.def.badgeLabel}
                        progressPct={m.progressPct}
                        unlocked={m.completed}
                        claimed={m.claimed}
                        claimable={m.claimable}
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              {m.def.title}
                            </div>
                            <div className="text-[10px] font-semibold text-[#1E3A2F] dark:text-amber-300/90 truncate">
                              {m.def.featLabel}
                            </div>
                          </div>
                          <span className="font-mono-num text-[11px] font-bold text-[#5C4936] dark:text-[#C5B29D] shrink-0">
                            {Math.min(m.current, m.target)}/{m.target}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#5C4936] dark:text-[#B4A08A] leading-snug mt-0.5 mb-2">
                          {m.def.description}
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-[#DAC7AA] dark:bg-[#120E0B]">
                            <div
                              className="h-full rounded-full bg-emerald-600 dark:bg-amber-400 transition-all"
                              style={{ width: `${m.progressPct}%` }}
                            />
                          </div>

                          <div className="shrink-0">
                            {m.claimed ? (
                              <span
                                data-testid={`milestone-collected-${m.def.id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200"
                              >
                                <Check className="w-3 h-3" />
                                <span>Collected</span>
                              </span>
                            ) : m.claimable ? (
                              <button
                                type="button"
                                data-testid={`claim-milestone-${m.def.id}`}
                                onClick={() => handleClaim(m.def.id)}
                                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-500 dark:text-[#120D08] dark:hover:bg-amber-400"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>
                                  Collect +{m.def.rewardGems} 💎
                                  {m.def.rewardSeedPacks > 0 ? ' +Pack' : ''}
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-[#C9B292] text-[#6E5A46] dark:border-[#3A2B1F] dark:text-[#A4907B]">
                                <Gem className="w-3 h-3 text-sky-600 dark:text-sky-300" />
                                <span>
                                  +{m.def.rewardGems}
                                  {m.def.rewardSeedPacks > 0 ? ' +Pack' : ''}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'memories' && (
            <div data-testid="journal-panel-memories" className="space-y-2.5">
              <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
                Every piece of furniture restored across your Cozy Haven rooms adds a quiet memory to your scrapbook ({memories.length}/24 unlocked).
              </p>

              {memories.length === 0 ? (
                <div className="rounded-2xl p-5 border text-center bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]">
                  <p className="text-sm font-semibold mb-1">
                    No room memories yet
                  </p>
                  <p className="text-xs text-[#6E5A46] dark:text-[#A4907B]">
                    Restore your first piece of furniture in My Haven to record your opening chapter note.
                  </p>
                </div>
              ) : (
                memories.map((entry) => (
                  <div
                    key={entry.key}
                    data-testid={`memory-entry-${entry.chapter}-${entry.slotId}`}
                    className="rounded-xl p-3 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#211A14] dark:border-[#3A2B1F]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-bold text-[#1E3A2F] dark:text-amber-300">
                        {entry.slotLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-[#7A654F] dark:text-[#A4907B]">
                        {entry.chapterTitle}
                      </span>
                    </div>
                    <p className="text-xs italic text-[#4D3B2A] dark:text-[#D9C9B6] leading-relaxed">
                      “{entry.note}”
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
