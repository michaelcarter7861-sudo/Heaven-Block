import { ENABLE_FULL_META } from '../game/features';
import { isAdMobAvailable } from '../game/admob';
import React, { useState } from 'react';
import {
  Check,
  CloudRain,
  Copy,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Shapes,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react';
import { APP_PACKAGE_ID, APP_VERSION } from '../game/nativeBridge';
import type { AdConsentStatus, PlayerSettings } from '../game/types';

interface SettingsModalProps {
  settings: PlayerSettings;
  adConsentStatus: AdConsentStatus;
  noAdsOwned: boolean;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onGenerateBackupCode: () => string;
  onRestoreBackupCode: (code: string) => { ok: boolean; message: string };
  onRestorePurchases: () => string | Promise<string>;
  onRequestAdConsent: () => Promise<string>;
  onOpenPrivacyTerms: () => void;
  onResetAllData: () => void;
  onClose: () => void;
}

interface SwitchRowProps {
  testId: string;
  label: string;
  description: string;
  checked: boolean;
  icon: React.ReactNode;
  onToggle: () => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({
  testId,
  label,
  description,
  checked,
  icon,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    data-testid={testId}
    onClick={onToggle}
    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors min-h-[54px]
      bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E7D8C0]
      dark:bg-[#221A14] dark:border-[#3D2E22] dark:hover:bg-[#2B2119]"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FAF5EC] text-[#1E3A2F] dark:bg-[#17120E] dark:text-amber-300">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#2A1F15] dark:text-[#F5EDE1]">
          {label}
        </div>
        <div className="text-[11px] text-[#6E5A46] dark:text-[#A4907B] truncate">
          {description}
        </div>
      </div>
    </div>
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked
          ? 'bg-[#1E3A2F] dark:bg-amber-500'
          : 'bg-[#CBB698] dark:bg-[#3A2C20]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[#FAF5EC] dark:bg-[#120D08] transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </span>
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  adConsentStatus,
  noAdsOwned,
  onUpdateSettings,
  onGenerateBackupCode,
  onRestoreBackupCode,
  onRestorePurchases,
  onRequestAdConsent,
  onOpenPrivacyTerms,
  onResetAllData,
  onClose,
}) => {
  const [backupCode, setBackupCode] = useState<string>('');
  const [copiedBackup, setCopiedBackup] = useState<boolean>(false);
  const [restoreInput, setRestoreInput] = useState<string>('');
  const [backupFeedback, setBackupFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [restorePurchaseMsg, setRestorePurchaseMsg] = useState<string | null>(
    null
  );
  const [restoringPurchases, setRestoringPurchases] = useState<boolean>(false);
  const [consentMsg, setConsentMsg] = useState<string | null>(null);
  const [requestingConsent, setRequestingConsent] = useState<boolean>(false);
  const [confirmResetStep, setConfirmResetStep] = useState<boolean>(false);

  const handleGenerateAndCopy = async () => {
    const code = onGenerateBackupCode();
    setBackupCode(code);
    setBackupFeedback({
      ok: true,
      message: 'Backup code generated. Save it somewhere safe.',
    });
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBackup(true);
      window.setTimeout(() => setCopiedBackup(false), 1800);
    } catch {
      // Clipboard optional in offline environments
    }
  };

  const handleCopyOnly = async () => {
    if (!backupCode) return;
    if (!navigator.clipboard?.writeText) {
      setBackupFeedback({
        ok: true,
        message: 'Tap the backup code box above and copy it manually.',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(backupCode);
      setCopiedBackup(true);
      window.setTimeout(() => setCopiedBackup(false), 1800);
    } catch {
      setCopiedBackup(false);
      setBackupFeedback({
        ok: true,
        message: 'Tap the backup code box above and copy it manually.',
      });
    }
  };

  const handleRestoreClick = () => {
    const res = onRestoreBackupCode(restoreInput);
    setBackupFeedback(res);
    if (res.ok) {
      setRestoreInput('');
    }
  };

  const handleRestorePurchasesClick = async () => {
    setRestoringPurchases(true);
    try {
      const msg = await onRestorePurchases();
      setRestorePurchaseMsg(msg);
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleConsentClick = async () => {
    if (requestingConsent) return;
    setRequestingConsent(true);
    setConsentMsg(null);
    try {
      const msg = await onRequestAdConsent();
      setConsentMsg(msg);
    } catch {
      setConsentMsg(
        'Ad privacy could not be checked. Check your internet connection and try again.'
      );
    } finally {
      setRequestingConsent(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Player Settings"
      data-testid="settings-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
    >
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">Settings & Save</h2>
            <p className="text-xs text-[#6E5A46] dark:text-[#A4907B]">
              Preferences, offline backup & Play Store options
            </p>
          </div>
          <button
            type="button"
            data-testid="close-settings-btn"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Audio, Ambient Soundscape, Accessibility & Haptics */}
        <div className="space-y-2 mb-5">
          <SwitchRow
            testId="setting-toggle-sound"
            label="Sound Effects"
            description="Wooden thocks, marimba chimes & room sparkles"
            checked={settings.soundEnabled}
            icon={<Volume2 className="w-4 h-4" />}
            onToggle={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
          />
          <SwitchRow
            testId="setting-toggle-ambient"
            label="Ambient Rain & Hearth"
            description="Gentle procedural rainfall & warm fireside hum"
            checked={Boolean(settings.ambientSoundEnabled)}
            icon={<CloudRain className="w-4 h-4" />}
            onToggle={() =>
              onUpdateSettings({
                ambientSoundEnabled: !settings.ambientSoundEnabled,
              })
            }
          />
          <SwitchRow
            testId="setting-toggle-colorblind"
            label="Colorblind Material Symbols"
            description="High-contrast ▲ ◆ ● ■ badges on Oak, Ceramic, Glass & Rattan"
            checked={Boolean(settings.colorblindMode)}
            icon={<Shapes className="w-4 h-4" />}
            onToggle={() =>
              onUpdateSettings({
                colorblindMode: !settings.colorblindMode,
              })
            }
          />
          <SwitchRow
            testId="setting-toggle-haptics"
            label="Haptic Feedback"
            description="Subtle tactile vibration when placing or clearing"
            checked={settings.hapticsEnabled}
            icon={<Vibrate className="w-4 h-4" />}
            onToggle={() =>
              onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })
            }
          />
          <SwitchRow
            testId="setting-toggle-shake"
            label="Screen Shake & Full Motion"
            description={
              settings.screenShakeEnabled
                ? 'Active on 3+ line clears & cascades'
                : 'Reduced Motion enabled (gentle animations)'
            }
            checked={settings.screenShakeEnabled}
            icon={<Sparkles className="w-4 h-4" />}
            onToggle={() =>
              onUpdateSettings({
                screenShakeEnabled: !settings.screenShakeEnabled,
              })
            }
          />
        </div>

        <section className="rounded-xl border border-current/20 p-3 text-xs">
          <h3 className="mb-1 font-bold">Verified Fair Solver</h3>
          <p>New trays are checked for a playable path on your current board. The seed and your moves drive the run locally, with no score-based difficulty adjustment in Zen or Daily. Later choices can still leave you out of moves.</p>
        </section>

        {/* 2. Backup / Restore Progress */}
        <div className="rounded-2xl p-3.5 mb-5 border bg-[#F3E9D8] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#33251B]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-bold">Backup / Restore Progress</h3>
              <p className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
                Copy your Cozy Room & puzzle save offline
              </p>
            </div>
            <button
              type="button"
              data-testid="generate-backup-btn"
              onClick={handleGenerateAndCopy}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08] shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {backupCode && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <textarea
                  readOnly
                  value={backupCode}
                  rows={2}
                  data-testid="backup-export-output"
                  aria-label="Exported backup code"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 p-2 rounded-xl text-[11px] font-mono-num border bg-[#FAF5EC] border-[#C9B292] text-[#2A1F15] dark:bg-[#0D0A08] dark:border-[#3D2E22] dark:text-amber-200 resize-none"
                />
                <button
                  type="button"
                  data-testid="copy-backup-btn"
                  onClick={handleCopyOnly}
                  aria-label="Copy backup code"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border bg-[#FAF5EC] border-[#C9B292] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22]"
                >
                  {copiedBackup ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={restoreInput}
              onChange={(e) => setRestoreInput(e.target.value)}
              data-testid="backup-restore-input"
              aria-label="Paste backup code to restore"
              placeholder="Paste HAVEN-SAVE-V2:... code"
              className="flex-1 min-h-[42px] px-3 rounded-xl text-xs font-mono-num border bg-[#FAF5EC] border-[#C9B292] text-[#2A1F15] placeholder:text-[#8C7760] dark:bg-[#0D0A08] dark:border-[#3D2E22] dark:text-[#F5EDE1]"
            />
            <button
              type="button"
              data-testid="restore-backup-btn"
              onClick={handleRestoreClick}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs font-semibold border bg-[#FAF5EC] border-[#C9B292] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22] dark:hover:bg-[#2C221A] shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          </div>

          {backupFeedback && (
            <p
              data-testid="backup-status-msg"
              className={`mt-2 text-xs font-medium ${
                backupFeedback.ok
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {backupFeedback.message}
            </p>
          )}
        </div>

        {/* 3. Play Store Legal, Consent, Purchase Restore & Local Data Deletion */}
        <div className="space-y-2">
          {ENABLE_FULL_META && <>
          <button
            type="button"
            data-testid="restore-purchases-btn"
            disabled={restoringPurchases}
            onClick={() => void handleRestorePurchasesClick()}
            className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E7D8C0] disabled:opacity-60 dark:bg-[#221A14] dark:border-[#3D2E22] dark:hover:bg-[#2B2119]"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw
                className={`w-4 h-4 text-[#1E3A2F] dark:text-amber-300 ${
                  restoringPurchases ? 'animate-spin' : ''
                }`}
              />
              <span>
                {restoringPurchases ? 'Checking Receipts...' : 'Restore Purchases'}
              </span>
            </span>
            <span className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
              {noAdsOwned ? 'VIP Active' : 'Play Billing'}
            </span>
          </button>
          {restorePurchaseMsg && (
            <p
              data-testid="restore-purchases-msg"
              className="px-1 text-[11px] text-[#6E5A46] dark:text-amber-200/90"
            >
              {restorePurchaseMsg}
            </p>
          )}
          </>}

          {isAdMobAvailable() && <>
          <button
            type="button"
            data-testid="ad-consent-btn"
            onClick={() => void handleConsentClick()}
            disabled={requestingConsent}
            className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E7D8C0] disabled:opacity-60 dark:bg-[#221A14] dark:border-[#3D2E22] dark:hover:bg-[#2B2119]"
          >
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1E3A2F] dark:text-amber-300" />
              <span>{requestingConsent ? 'Checking Ad Privacy…' : 'Ad Privacy & Consent (UMP)'}</span>
            </span>
            <span className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
              {requestingConsent ? 'Please wait' : adConsentStatus === 'obtained' ? 'Ready' : 'Review'}
            </span>
          </button>
          {consentMsg && (
            <p
              data-testid="ad-consent-msg"
              className="px-1 text-[11px] text-emerald-700 dark:text-emerald-400"
            >
              {consentMsg}
            </p>
          )}
          </>}

          <button
            type="button"
            data-testid="open-privacy-terms-btn"
            onClick={onOpenPrivacyTerms}
            className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#3D2E22] dark:hover:bg-[#2B2119]"
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E3A2F] dark:text-amber-300" />
              <span>Privacy Policy & Terms</span>
            </span>
            <span className="text-[11px] text-[#6E5A46] dark:text-[#A4907B]">
              Read
            </span>
          </button>

          {/* On-Device Data Deletion (Play Store Data Safety Compliance) */}
          {!confirmResetStep ? (
            <button
              type="button"
              data-testid="reset-data-btn"
              onClick={() => setConfirmResetStep(true)}
              className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border bg-[#EFE4D2]/70 border-[#D4C0A3] text-rose-800 hover:bg-rose-50 hover:border-rose-300 dark:bg-[#1E1412] dark:border-[#4A2622] dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete Local Save Data</span>
              </span>
              <span className="text-[11px] opacity-80">Reset</span>
            </button>
          ) : (
            <div
              data-testid="reset-data-confirm-box"
              className="p-3 rounded-xl border bg-rose-50 border-rose-300 text-rose-950 dark:bg-rose-950/35 dark:border-rose-500/40 dark:text-rose-100"
            >
              <p className="text-xs font-semibold mb-2">
                Erase all local rooms, stars, gems, and puzzle progress on this
                device? Export a backup code above first if you want to keep it.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="confirm-reset-data-btn"
                  onClick={() => {
                    setConfirmResetStep(false);
                    onResetAllData();
                  }}
                  className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  data-testid="cancel-reset-data-btn"
                  onClick={() => setConfirmResetStep(false)}
                  className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-300 bg-white/80 text-rose-900 hover:bg-white dark:bg-[#1B1410] dark:border-[#4A2622] dark:text-rose-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* App Version & Play Store Identity Footer */}
        <div
          data-testid="settings-version-footer"
          className="mt-4 pt-3 border-t border-[#D8C5A8] dark:border-[#2E2219] flex items-center justify-between gap-2 text-[11px] text-[#7A654F] dark:text-[#9A856F]"
        >
          <span className="font-mono-num">
            HavenBlocks v{APP_VERSION} · Offline-First
          </span>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            title={APP_PACKAGE_ID}
            className="inline-flex items-center gap-1 font-semibold text-[#1E3A2F] hover:underline dark:text-amber-300"
          >
            <span>Web Policy</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
