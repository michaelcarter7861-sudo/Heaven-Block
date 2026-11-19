import React from 'react';
import {
  Check,
  Film,
  Gift,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  AD_REWARD_META,
  cancelRewardedAd,
  canClaimDailyStreak,
  COZY_STARTER_BUNDLE,
  DAILY_STREAK_REWARDS,
  getNextStreakDay,
  isNativePlatform,
  type RewardedAdPreviewStatus,
} from '../game/monetization';
import type { MonetizationState } from '../game/types';

interface RewardedAdModalProps {
  status: RewardedAdPreviewStatus;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ status }) => {
  const meta = AD_REWARD_META[status.rewardType];
  const progressPct = Math.min(
    100,
    Math.round(((status.durationMs - status.remainingMs) / status.durationMs) * 100)
  );
  const secondsLeft = Math.max(0.1, status.remainingMs / 1000).toFixed(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rewarded Ad Preview"
      data-testid="rewarded-ad-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <Film className="w-3.5 h-3.5" />
            <span>Play Store Ad Preview</span>
          </span>
          <button
            type="button"
            onClick={cancelRewardedAd}
            aria-label="Cancel ad preview"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl p-4 mb-4 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#120E0B] dark:border-[#33251B] text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-2.5 flex items-center justify-center bg-[#1E3A2F] text-amber-300 dark:bg-amber-600 dark:text-[#120D08]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold mb-1">{meta.title}</h2>
          <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A] mb-2">
            {meta.subtitle}
          </p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200">
            Reward: {meta.rewardBadge}
          </span>
        </div>

        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span className="text-[#6E5A46] dark:text-[#B4A08A]">
            Granting reward...
          </span>
          <span className="font-mono-num text-[#1E3A2F] dark:text-amber-300">
            {secondsLeft}s
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-[#D8C5A8] dark:bg-[#2B2017]">
          <div
            className="h-full transition-all duration-75 bg-[#1E3A2F] dark:bg-amber-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface StarterBundleModalProps {
  purchased: boolean;
  onPurchase: () => void;
  onClose: () => void;
}

export const StarterBundleModal: React.FC<StarterBundleModalProps> = ({
  purchased,
  onPurchase,
  onClose,
}) => {
  const isNative = isNativePlatform();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="No Ads Cozy Starter Bundle"
      data-testid="starter-bundle-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isNative ? 'Cozy Shop · Play Store' : 'Coming to Android'}</span>
            </div>
            <h2 className="font-display text-xl font-bold">
              {COZY_STARTER_BUNDLE.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close store modal"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="space-y-2 mb-5">
          {COZY_STARTER_BUNDLE.perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#EFE4D2] dark:bg-[#241C16] text-xs font-medium"
            >
              <Check className="w-4 h-4 shrink-0 text-emerald-700 dark:text-amber-400 mt-0.5" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {purchased ? (
          <div
            data-testid="bundle-owned-badge"
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl font-semibold text-sm bg-emerald-700/15 text-emerald-900 border border-emerald-700/30 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/40"
          >
            <Check className="w-4 h-4" />
            <span>VIP Bundle Active — Ad-Free Perks</span>
          </div>
        ) : isNative ? (
          <button
            type="button"
            data-testid="purchase-bundle-btn"
            onClick={onPurchase}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Unlock Bundle · {COZY_STARTER_BUNDLE.priceLabel}</span>
          </button>
        ) : (
          <div
            data-testid="bundle-coming-to-android"
            className="w-full min-h-[46px] px-4 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 bg-[#EFE4D2] border-[#C9B292] text-[#5C4936] dark:bg-[#241C16] dark:border-[#3D2E22] dark:text-amber-200"
          >
            <span>Coming to Android Google Play</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 min-h-[40px] text-xs font-semibold text-[#6E5A46] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

interface DailyStreakModalProps {
  monetization: MonetizationState;
  onClaim: () => void;
  onClose: () => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({
  monetization,
  onClaim,
  onClose,
}) => {
  const claimable = canClaimDailyStreak(monetization);
  const targetDay = getNextStreakDay(monetization);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak Rewards"
      data-testid="daily-streak-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-md rounded-2xl p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
              <Gift className="w-3.5 h-3.5" />
              <span>Daily Cozy Gift · Pause &amp; Resume</span>
            </div>
            <h2 className="font-display text-xl font-bold">
              7-Day Cozy Gift Calendar
            </h2>
            <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A] mt-0.5">
              No streak pressure — missed days pause and resume right where you left off.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily streak popup"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {DAILY_STREAK_REWARDS.map((item) => {
            const isPast = claimable
              ? item.day < targetDay
              : item.day <= monetization.streakCount;
            const isToday = claimable && item.day === targetDay;
            return (
              <div
                key={item.day}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center ${
                  item.day === 7 ? 'col-span-2' : ''
                } ${
                  isToday
                    ? 'ring-2 ring-[#1E3A2F] dark:ring-amber-400 bg-amber-100/90 border-amber-500 dark:bg-amber-500/20 dark:border-amber-400'
                    : isPast
                      ? 'bg-[#E3D4BC] border-[#C9B292] opacity-75 dark:bg-[#241C16] dark:border-[#3D2E22]'
                      : 'bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#2F2319]'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-[#6E5A46] dark:text-[#A4907B]">
                  Day {item.day}
                </div>
                <div className="my-1">
                  {isPast ? (
                    <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                  ) : (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  )}
                </div>
                <div className="text-[11px] font-bold leading-tight">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {claimable ? (
          <button
            type="button"
            data-testid="claim-daily-streak-btn"
            onClick={onClaim}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            <Gift className="w-4 h-4" />
            <span>Claim Day {targetDay} Gift</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22]"
          >
            <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>Today&apos;s Gift Claimed</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface PrivacyTermsModalProps {
  onClose: () => void;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy and Terms"
      data-testid="privacy-terms-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65"
    >
      <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl p-5 sm:p-6 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-xl font-bold">
              Privacy Policy &amp; Terms
            </h2>
            <p className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
              HavenBlocks · Offline-First Cozy Puzzle
            </p>
          </div>
          <button
            type="button"
            data-testid="close-privacy-terms-btn"
            onClick={onClose}
            aria-label="Close privacy policy and terms"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 text-xs leading-relaxed text-[#4D3B2A] dark:text-[#D7C7B4]">
          <section>
            <h3 className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-1">
              1. Local Storage &amp; Zero Account Tracking
            </h3>
            <p>
              HavenBlocks runs 100% offline. Your puzzle progress, Cozy Room
              furniture, Herbarium cards, and preferences are stored strictly on
              your device using local browser storage. You can export or restore
              a portable backup code anytime inside Settings.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-1">
              2. Optional Rewarded Ads &amp; Consent (Google UMP)
            </h3>
            <p>
              HavenBlocks never forces disruptive interstitial ads. Watching a
              rewarded ad for extra Undo, Rotate, Revive, or Double Stars is
              strictly opt-in. On Google Play builds, regional privacy consent is
              managed via Google User Messaging Platform (UMP).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-1">
              3. Purchases &amp; Terms of Use
            </h3>
            <p>
              Optional bundles and Cozy Gem packs are processed through Google
              Play Billing. Non-consumable entitlements such as the &ldquo;No
              Ads + Cozy Starter Bundle&rdquo; can be restored from Settings.
              Game progress is provided for personal entertainment with no
              real-money wagering.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-[#2A1F15] dark:text-[#F5EDE1] mb-1">
              4. Data Deletion &amp; Standalone Policy
            </h3>
            <p>
              You can erase all local game data immediately using{' '}
              <strong>Settings &rarr; Delete Local Save Data</strong> or by
              clearing app storage on Android. View the standalone Play Store
              policy page at{' '}
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-[#1E3A2F] dark:text-amber-300"
              >
                /privacy.html
              </a>
              .
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full min-h-[46px] rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

interface RateUsModalProps {
  onRateNow: () => void;
  onDismiss: () => void;
}

export const RateUsModal: React.FC<RateUsModalProps> = ({
  onRateNow,
  onDismiss,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rate HavenBlocks"
      data-testid="rate-us-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className="w-6 h-6 text-amber-500 fill-amber-400"
            />
          ))}
        </div>
        <h2 className="font-display text-xl font-bold mb-1.5">
          Love HavenBlocks? Rate Us!
        </h2>
        <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A] mb-5 leading-relaxed">
          Your Cozy Room is coming to life! A quick Play Store rating helps
          more puzzle fans discover our cozy cottage.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="rate-us-confirm-btn"
            onClick={onRateNow}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
          >
            Rate 5 Stars on Play Store
          </button>
          <button
            type="button"
            data-testid="rate-us-dismiss-btn"
            onClick={onDismiss}
            className="w-full min-h-[42px] text-xs font-semibold text-[#6E5A46] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

