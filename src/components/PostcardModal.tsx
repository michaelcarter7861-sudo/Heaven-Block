import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Share2, X } from 'lucide-react';
import { renderHavenPostcardToCanvas } from '../game/postcard';
import { getSharePlayUrl } from '../game/monetization';
import { normalizeSeedCode } from '../game/shapes';
import type { HavenProgress, HerbariumProgress } from '../game/types';

interface PostcardModalProps {
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  nightCandleMode: boolean;
  bestScore: number;
  cozyStars: number;
  fireflyStreak: number;
  seedCode?: string;
  onClose: () => void;
}

export const PostcardModal: React.FC<PostcardModalProps> = ({
  haven,
  herbarium,
  nightCandleMode,
  bestScore,
  cozyStars,
  fireflyStreak,
  seedCode = 'HAVEN-2026',
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pngUrl, setPngUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const [downloadedNotice, setDownloadedNotice] = useState<boolean>(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const cleanSeed = normalizeSeedCode(seedCode);
  const canonicalDuelUrl = getSharePlayUrl(cleanSeed);
  const shareCaption = `My HavenBlocks Cozy Room — Best Score: ${bestScore.toLocaleString()} · ${herbarium.unlockedCardIds.length}/24 Herbarium Cards!${canonicalDuelUrl ? ` Play this same board: ${canonicalDuelUrl}` : ` Seed: ${cleanSeed}`}`;
  const canUseNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderHavenPostcardToCanvas(canvas, {
      haven,
      herbarium,
      nightCandleMode,
      bestScore,
      cozyStars,
      fireflyStreak,
      seedCode: cleanSeed,
      playUrl: canonicalDuelUrl,
    });
    try {
      setPngUrl(canvas.toDataURL('image/png'));
    } catch {
      setPngUrl('');
    }
  }, [
    haven,
    herbarium,
    nightCandleMode,
    bestScore,
    cozyStars,
    fireflyStreak,
    cleanSeed,
    canonicalDuelUrl,
  ]);

  const handleCopyPlayLink = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopiedLink(false);
      setCopyFallbackText(shareCaption);
      return;
    }
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopiedLink(true);
      setCopyFallbackText(null);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
      setCopyFallbackText(shareCaption);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canUseNativeShare) {
      await handleCopyPlayLink();
      return;
    }
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        const file = new File([blob], 'havenblocks-postcard.png', {
          type: 'image/png',
        });
        const shareData: ShareData = {
          title: 'My Cozy Haven Postcard',
          text: shareCaption,
          files: [file],
        };
        if (canonicalDuelUrl) shareData.url = canonicalDuelUrl;
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setShareNote('Shared!');
          window.setTimeout(() => setShareNote(null), 1800);
          return;
        }
      }
      const shareData: ShareData = {
        title: 'My Cozy Haven Postcard',
        text: shareCaption,
      };
      if (canonicalDuelUrl) shareData.url = canonicalDuelUrl;
      await navigator.share(shareData);
      setShareNote('Shared!');
      window.setTimeout(() => setShareNote(null), 1800);
    } catch {
      await handleCopyPlayLink();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Haven Postcard Snapshot"
      data-testid="postcard-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl p-4 sm:p-5 border shadow-2xl bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold">
              Haven Postcard Snapshot
            </h2>
            <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
              Rendered offline via HTML5 Canvas with your room, pet &amp; board link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close postcard modal"
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#CDB694] dark:border-[#3A2B1F] mb-3 bg-[#EFE4D2] dark:bg-[#120E0B]">
          <canvas
            ref={canvasRef}
            data-testid="postcard-canvas"
            className="w-full h-auto block"
          />
        </div>

        {/* Share Caption & Canonical ?duel=<SEED> Play URL */}
        <div className="rounded-xl p-3 mb-3.5 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#33251B]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A46] dark:text-amber-300/85">
              Play this same board · Same starting board &amp; seed
            </span>
            <span className="font-mono-num text-xs font-bold text-[#1E3A2F] dark:text-amber-300">
              Seed: {cleanSeed}
            </span>
          </div>
          {canonicalDuelUrl ? (
            <a
              href={canonicalDuelUrl}
              data-testid="postcard-canonical-url"
              className="inline-flex items-center gap-1.5 text-xs font-mono-num font-semibold underline break-all text-[#1E3A2F] hover:text-[#274C3D] dark:text-amber-300 dark:hover:text-amber-200"
            >
              <span>{canonicalDuelUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          ) : (
            <span data-testid="postcard-share-seed" className="inline-flex items-center gap-1.5 text-xs font-mono-num font-semibold break-all">
              Seed: {cleanSeed}
            </span>
          )}

          {copyFallbackText && (
            <div className="mt-2">
              <label className="block text-[11px] font-semibold text-[#6E5A46] dark:text-[#B4A08A] mb-1">
                Clipboard blocked by browser — tap box below to copy link:
              </label>
              <input
                type="text"
                readOnly
                data-testid="postcard-copy-fallback-input"
                value={copyFallbackText}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                aria-label="Selectable board challenge URL"
                className="w-full min-h-[38px] px-2.5 py-1 rounded-lg font-mono-num text-xs border bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] dark:bg-[#1F1812] dark:border-[#4A3828] dark:text-amber-200"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            data-testid="copy-postcard-link-btn"
            onClick={handleCopyPlayLink}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {pngUrl ? (
            <a
              href={pngUrl}
              download="havenblocks-postcard.png"
              data-testid="download-postcard-link"
              onClick={() => {
                setDownloadedNotice(true);
                window.setTimeout(() => setDownloadedNotice(false), 2000);
              }}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 py-2 rounded-xl font-semibold text-xs sm:text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
            >
              {downloadedNotice ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>PNG Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Postcard PNG</span>
                </>
              )}
            </a>
          ) : null}

          {canUseNativeShare && (
            <button
              type="button"
              data-testid="share-postcard-native-btn"
              onClick={handleNativeShare}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm border bg-[#EFE4D2] border-[#D4C0A3] hover:bg-[#E5D4BA] dark:bg-[#241C16] dark:border-[#3D2E22] dark:hover:bg-[#2E241C]"
            >
              {shareNote ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700 dark:text-amber-300" />
                  <span>{shareNote}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Postcard</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
