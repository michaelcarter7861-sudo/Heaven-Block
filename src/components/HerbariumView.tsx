import React, { useState } from 'react';
import { Check, Leaf, Lock, PackageOpen, Sparkles } from 'lucide-react';
import {
  HERBARIUM_CARDS,
  HERBARIUM_CATEGORY_META,
  openSeedPack,
  PET_ACCESSORIES,
  type SeedPackOpenResult,
  unlockOrTogglePetAccessory,
} from '../game/herbarium';
import { cozyAudio } from '../game/audio';
import type {
  HerbariumCardDef,
  HerbariumCategory,
  HerbariumProgress,
  PetAccessoryId,
} from '../game/types';

interface HerbariumViewProps {
  herbarium: HerbariumProgress;
  unlockedLevel: number;
  onUpdateHerbarium: (next: HerbariumProgress) => void;
}

const CardArtwork: React.FC<{ card: HerbariumCardDef; unlocked: boolean }> = ({
  card,
  unlocked,
}) => {
  if (!unlocked) {
    return (
      <svg viewBox="0 0 80 64" className="w-full h-16" aria-hidden="true">
        <rect
          x="6"
          y="6"
          width="68"
          height="52"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.35"
        />
        <circle cx="40" cy="32" r="10" fill="currentColor" opacity="0.12" />
      </svg>
    );
  }

  if (card.category === 'botanicals') {
    return (
      <svg viewBox="0 0 80 64" className="w-full h-16" aria-hidden="true">
        <rect x="4" y="4" width="72" height="56" rx="8" fill={card.bgHex} />
        <path
          d="M40,52 Q38,34 40,18"
          stroke={card.trimHex}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="30"
          cy="34"
          rx="9"
          ry="4.5"
          transform="rotate(-24 30 34)"
          fill={card.trimHex}
        />
        <ellipse
          cx="50"
          cy="30"
          rx="9"
          ry="4.5"
          transform="rotate(24 50 30)"
          fill={card.trimHex}
        />
        <circle cx="40" cy="18" r="9" fill={card.accentHex} />
        <circle cx="40" cy="18" r="4" fill="#FEF3C7" />
      </svg>
    );
  }

  if (card.category === 'teacups') {
    return (
      <svg viewBox="0 0 80 64" className="w-full h-16" aria-hidden="true">
        <rect x="4" y="4" width="72" height="56" rx="8" fill={card.bgHex} />
        <ellipse cx="40" cy="48" rx="22" ry="5" fill={card.trimHex} opacity="0.85" />
        <path
          d="M24,26 L56,26 Q54,46 40,46 Q26,46 24,26 Z"
          fill={card.accentHex}
          stroke={card.trimHex}
          strokeWidth="2"
        />
        <path
          d="M55,29 Q63,29 63,36 Q63,41 53,41"
          fill="none"
          stroke={card.trimHex}
          strokeWidth="2.5"
        />
        <path
          d="M35,19 Q33,13 37,10 M44,19 Q42,13 46,10"
          fill="none"
          stroke={card.trimHex}
          strokeWidth="1.5"
          opacity="0.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 64" className="w-full h-16" aria-hidden="true">
      <rect x="4" y="4" width="72" height="56" rx="8" fill={card.bgHex} />
      <circle cx="40" cy="36" r="14" fill={card.accentHex} />
      <polygon points="28,28 31,17 37,24" fill={card.accentHex} />
      <polygon points="43,24 49,17 52,28" fill={card.accentHex} />
      <circle cx="35" cy="35" r="2" fill="#1F1209" />
      <circle cx="45" cy="35" r="2" fill="#1F1209" />
      <path
        d="M37,40 Q40,43 43,40"
        fill="none"
        stroke={card.trimHex}
        strokeWidth="1.8"
      />
    </svg>
  );
};

export const HerbariumView: React.FC<HerbariumViewProps> = ({
  herbarium,
  unlockedLevel,
  onUpdateHerbarium,
}) => {
  const [filter, setFilter] = useState<'all' | HerbariumCategory>('all');
  const [lastPackResult, setLastPackResult] = useState<SeedPackOpenResult | null>(
    null
  );
  const [accessoryMsg, setAccessoryMsg] = useState<string | null>(null);

  const unlockedCount = herbarium.unlockedCardIds.length;
  const levelsUntilPack = 3 - (herbarium.storyWinsCount % 3);

  const visibleCards =
    filter === 'all'
      ? HERBARIUM_CARDS
      : HERBARIUM_CARDS.filter((c) => c.category === filter);

  const handleOpenPack = () => {
    if (herbarium.seedPacks <= 0) return;
    const res = openSeedPack(herbarium);
    if (!res.opened) return;
    cozyAudio.playPackOpen();
    setLastPackResult(res);
    setAccessoryMsg(null);
    onUpdateHerbarium(res.nextHerbarium);
  };

  const handleAccessoryClick = (accId: PetAccessoryId) => {
    const res = unlockOrTogglePetAccessory(herbarium, accId);
    if (!res.success) {
      const def = PET_ACCESSORIES.find((a) => a.id === accId);
      setAccessoryMsg(
        `Need ${def?.costLeaves ?? 2} Golden Leaves (earned from duplicate cards)`
      );
      return;
    }
    cozyAudio.playDecorate();
    setAccessoryMsg(
      res.unlockedNew
        ? 'Accessory unlocked & equipped!'
        : res.nextHerbarium.equippedAccessory === accId
          ? 'Accessory equipped!'
          : 'Accessory removed'
    );
    onUpdateHerbarium(res.nextHerbarium);
  };

  return (
    <div data-testid="herbarium-view" className="flex flex-col gap-3">
      {/* Seed Pack & Golden Leaf Summary Strip */}
      <div className="rounded-2xl p-3.5 sm:p-4 border flex flex-wrap items-center justify-between gap-3 bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]">
        <div className="flex-1 min-w-[220px]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5A46] dark:text-amber-300/80">
            D30 Scrapbook · {unlockedCount}/24 Cards Collected ({Math.round((unlockedCount / 24) * 100)}%)
          </div>
          <h2 className="font-display text-lg font-bold text-[#2A1F15] dark:text-[#F5EDE1]">
            Cozy Herbarium &amp; Pet Wardrobe
          </h2>
          <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
            Seed Pack every 3 Story levels · Next pack in {levelsUntilPack} win
            {levelsUntilPack === 1 ? '' : 's'} (Lv {unlockedLevel}) · Every pack guarantees undiscovered cards!
          </p>
          <div className="w-full max-w-xs h-2 rounded-full overflow-hidden bg-[#D8C5A8] dark:bg-[#2B2017] mt-2">
            <div
              className="h-full bg-[#1E3A2F] dark:bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.round((unlockedCount / 24) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-2 rounded-xl border bg-[#FAF5EC] border-[#D4C0A3] dark:bg-[#221A14] dark:border-[#3A2B1F] flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span
              data-testid="golden-leaves-count"
              className="font-mono-num text-sm font-bold text-[#1E3A2F] dark:text-amber-300"
            >
              {herbarium.goldenLeaves}
            </span>
            <span className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
              Leaves
            </span>
          </div>

          <button
            type="button"
            data-testid="open-seed-pack-btn"
            onClick={handleOpenPack}
            disabled={herbarium.seedPacks <= 0}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              herbarium.seedPacks > 0
                ? 'bg-[#1E3A2F] text-[#FDF8F2] hover:bg-[#274C3D] dark:bg-amber-600 dark:text-[#120D08] dark:hover:bg-amber-500'
                : 'bg-[#DFCEB2] text-[#7A654F] cursor-not-allowed dark:bg-[#241C16] dark:text-[#786552]'
            }`}
          >
            <PackageOpen className="w-4 h-4" />
            <span>Open Seed Pack ({herbarium.seedPacks})</span>
          </button>
        </div>
      </div>

      {/* Newly Opened Pack Reveal Banner */}
      {lastPackResult && lastPackResult.opened && (
        <div
          data-testid="pack-reveal-panel"
          className="rounded-2xl p-3.5 border bg-amber-50/90 border-amber-400/70 dark:bg-[#21190F] dark:border-amber-500/50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>Seed Pack Opened · 3 Cards Drawn!</span>
            </span>
            {lastPackResult.totalLeavesGained > 0 && (
              <span className="text-xs font-bold text-emerald-800 dark:text-amber-200">
                +{lastPackResult.totalLeavesGained} Golden Leaves from duplicates
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {lastPackResult.drawn.map((entry, idx) => (
              <div
                key={`${entry.card.id}_${idx}`}
                className="flex items-center gap-2.5 p-2 rounded-xl border bg-[#FAF5EC] border-[#D4C0A3] dark:bg-[#16110D] dark:border-[#3A2B1F]"
              >
                <div className="w-16 shrink-0">
                  <CardArtwork card={entry.card} unlocked />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {entry.card.title}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {entry.isDuplicate
                      ? `Duplicate → +${entry.leavesGained} Leaf`
                      : 'New Scrapbook Card!'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pet Wardrobe (6 Golden Leaf Accessories) */}
      <div className="rounded-2xl p-3.5 sm:p-4 border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#17120E] dark:border-[#36281D]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div>
            <h3 className="font-display text-base font-bold text-[#2A1F15] dark:text-[#F5EDE1]">
              Pet Accessories (6 Styles)
            </h3>
            <p className="text-xs text-[#6E5A46] dark:text-[#B4A08A]">
              Duplicate cards convert into Golden Leaves to dress up your Cozy Pet
            </p>
          </div>
          {accessoryMsg && (
            <span
              data-testid="accessory-feedback"
              className="text-xs font-semibold text-[#1E3A2F] dark:text-amber-300"
            >
              {accessoryMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PET_ACCESSORIES.map((acc) => {
            const owned = herbarium.unlockedAccessories.includes(acc.id);
            const equipped = herbarium.equippedAccessory === acc.id;
            const cantAfford = !owned && herbarium.goldenLeaves < acc.costLeaves;

            return (
              <button
                key={acc.id}
                type="button"
                data-testid={`pet-accessory-${acc.id}`}
                onClick={() => handleAccessoryClick(acc.id)}
                className={`flex flex-col items-start justify-between p-2.5 rounded-xl border text-left transition-colors min-h-[78px] ${
                  equipped
                    ? 'ring-2 ring-[#1E3A2F] dark:ring-amber-400 bg-[#FAF5EC] border-[#1E3A2F] dark:bg-[#241C16] dark:border-amber-400'
                    : owned
                      ? 'bg-[#FAF5EC] border-[#D4C0A3] hover:bg-[#F5EBD9] dark:bg-[#211A14] dark:border-[#3A2B1F]'
                      : cantAfford
                        ? 'bg-[#E5D7C1]/65 border-[#D4C0A3] opacity-75 dark:bg-[#130F0C] dark:border-[#2C2017]'
                        : 'bg-[#FAF5EC] border-amber-500/60 hover:bg-amber-50 dark:bg-[#211A14] dark:border-amber-500/40'
                }`}
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/15"
                    style={{ backgroundColor: acc.swatchHex }}
                  />
                  {equipped ? (
                    <Check className="w-3.5 h-3.5 text-[#1E3A2F] dark:text-amber-300" />
                  ) : !owned ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono-num font-bold text-amber-800 dark:text-amber-300">
                      {cantAfford && <Lock className="w-2.5 h-2.5" />}
                      {acc.costLeaves}L
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5">
                  <div className="text-xs font-bold leading-tight">
                    {acc.name}
                  </div>
                  <div className="text-[10px] text-[#6E5A46] dark:text-[#A4907B]">
                    {equipped ? 'Equipped' : owned ? 'Equip' : 'Unlock'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Herbarium categories"
          className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#E4D4BA] dark:bg-[#110D0A]"
        >
          {(
            [
              { id: 'all', label: 'All (24)' },
              { id: 'botanicals', label: HERBARIUM_CATEGORY_META.botanicals.label },
              { id: 'teacups', label: HERBARIUM_CATEGORY_META.teacups.label },
              { id: 'pet_moments', label: HERBARIUM_CATEGORY_META.pet_moments.label },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-[#1E3A2F] text-[#FDF8F2] dark:bg-amber-600 dark:text-[#120D08]'
                  : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 24-Card Scrapbook Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {visibleCards.map((card) => {
          const count = herbarium.cardCounts[card.id] ?? 0;
          const unlocked = herbarium.unlockedCardIds.includes(card.id);
          return (
            <div
              key={card.id}
              data-testid={`herbarium-card-${card.id}`}
              className={`rounded-xl p-2 border flex flex-col justify-between transition-colors ${
                unlocked
                  ? 'bg-[#FAF5EC] border-[#D4C0A3] dark:bg-[#1E1712] dark:border-[#3D2E22]'
                  : 'bg-[#E9DEC9]/65 border-[#D8C5A8] opacity-70 dark:bg-[#120E0B] dark:border-[#2A1F16]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono-num text-[#6E5A46] dark:text-[#A4907B] mb-1">
                <span>#{String(card.number).padStart(2, '0')}</span>
                <span>
                  {unlocked && count > 1
                    ? `×${count}`
                    : card.rarity === 'heirloom'
                      ? 'Heirloom'
                      : card.rarity === 'rare'
                        ? 'Rare'
                        : 'Common'}
                </span>
              </div>
              <CardArtwork card={card} unlocked={unlocked} />
              <div className="mt-1.5">
                <div className="text-xs font-bold leading-tight truncate text-[#2A1F15] dark:text-[#F5EDE1]">
                  {unlocked ? card.title : 'Undiscovered'}
                </div>
                <div className="text-[10px] truncate text-[#6E5A46] dark:text-[#A4907B]">
                  {unlocked ? card.latinOrNote : 'Open Seed Packs'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
