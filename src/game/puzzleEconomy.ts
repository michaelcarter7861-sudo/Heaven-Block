import { getTodayDateKey } from './monetization';

export const START_SPINS = 1;
export const MAX_SPINS = 2;
export const MAX_UNDOS = 1;
export const POCKET_COOLDOWN = 2;
export const DAILY_TARGET = 1500;
export const DAILY_MILESTONES = [1500, 3000, 5000, 10000] as const;

export interface DailyMilestoneProgress {
  completed: number;
  base: number;
  target: number;
  next: number | null;
  progress: number;
  finished: boolean;
}

/** Absolute Daily milestone state. Progress is relative to the current tier. */
export function getDailyMilestoneProgress(score: number): DailyMilestoneProgress {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  for (let index = 0; index < DAILY_MILESTONES.length; index++) {
    const target = DAILY_MILESTONES[index];
    if (safeScore < target) {
      const base = index === 0 ? 0 : DAILY_MILESTONES[index - 1];
      return {
        completed: index,
        base,
        target,
        next: target,
        progress: (safeScore - base) / (target - base),
        finished: false,
      };
    }
  }
  return {
    completed: DAILY_MILESTONES.length,
    base: DAILY_MILESTONES[DAILY_MILESTONES.length - 1],
    target: DAILY_MILESTONES[DAILY_MILESTONES.length - 1],
    next: null,
    progress: 1,
    finished: true,
  };
}

export function clampPower(value: number | undefined, limit: number, fallback = 1): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(limit, Math.floor(value!))) : fallback;
}

export function dailyStreak(dates: string[], now = new Date()): number {
  const played = new Set(dates);
  const cursor = new Date(now);
  if (!played.has(getTodayDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (played.has(getTodayDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function conservatoryTheme(score: number, night: boolean) {
  return night || score >= 5000 ? 'candlelight' : score >= 2000 ? 'rain' : 'morning';
}
