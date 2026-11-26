import React from 'react';
import {
  getActiveTierState,
  getMaterialColor,
  type LevelTierNumber,
} from '../game/shapes';
import type {
  BoardShapeId,
  MaterialType,
  SpecialBlockType,
  TileSkinId,
} from '../game/types';

export const ActiveTierContext = React.createContext<LevelTierNumber | undefined>(
  undefined
);

interface ArtisanTileProps {
  lightweight?: boolean;
  material: MaterialType;
  tier?: LevelTierNumber;
  tileSkin?: TileSkinId;
  className?: string;
  ghost?: boolean;
  highlightClear?: boolean;
  justPlaced?: boolean;
  clearing?: boolean;
  special?: SpecialBlockType;
  hasAcornGem?: boolean;
  compact?: boolean;
}

const SpecialOverlay: React.FC<{ special: SpecialBlockType; compact?: boolean }> = ({
  special,
  compact = false,
}) => {
  if (special === 'amber_honey') {
    return (
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="absolute inset-[1px] rounded-[5px] ring-2 ring-amber-300/90" />
        <svg
          viewBox="0 0 24 24"
          className={compact ? 'w-3 h-3 drop-shadow' : 'w-5 h-5 drop-shadow'}
        >
          <polygon
            points="12,2 20,6.8 20,17.2 12,22 4,17.2 4,6.8"
            fill="#FDE047"
            fillOpacity="0.92"
            stroke="#78350F"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="12" r="3" fill="#B45309" fillOpacity="0.55" />
        </svg>
      </div>
    );
  }

  if (special === 'bloom_seed') {
    return (
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="absolute inset-[1px] rounded-[5px] ring-2 ring-emerald-300/85" />
        <svg
          viewBox="0 0 24 24"
          className={compact ? 'w-3 h-3 drop-shadow' : 'w-5 h-5 drop-shadow'}
        >
          <path
            d="M12 20 V11"
            stroke="#14532D"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M12 12 C12 7, 17 4, 20 5 C20 9, 16 12, 12 12 Z"
            fill="#4ADE80"
            stroke="#14532D"
            strokeWidth="1.3"
          />
          <path
            d="M12 14 C12 9, 7 6, 4 7 C4 11, 8 14, 12 14 Z"
            fill="#86EFAC"
            stroke="#14532D"
            strokeWidth="1.3"
          />
        </svg>
      </div>
    );
  }

  // lantern_glow
  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-[5px]"
        style={{
          background:
            'radial-gradient(circle, rgba(254,240,138,0.5) 0%, rgba(245,158,11,0.12) 70%)',
        }}
      />
      <div className="absolute inset-[1px] rounded-[5px] ring-2 ring-amber-200/95" />
      <svg
        viewBox="0 0 24 24"
        className={compact ? 'w-3 h-3 drop-shadow' : 'w-5 h-5 drop-shadow'}
      >
        <line x1="12" y1="2.5" x2="12" y2="5" stroke="#78350F" strokeWidth="1.8" />
        <rect
          x="7"
          y="5"
          width="10"
          height="13"
          rx="4"
          fill="#FEF08A"
          stroke="#78350F"
          strokeWidth="1.6"
        />
        <ellipse cx="12" cy="11.5" rx="2.5" ry="3.5" fill="#F97316" fillOpacity="0.85" />
        <line x1="9" y1="18.5" x2="15" y2="18.5" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const AcornGemBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={`absolute pointer-events-none ${
      compact ? 'top-0.5 right-0.5 w-2.5 h-2.5' : 'top-1 right-1 w-3.5 h-3.5'
    }`}
    aria-hidden="true"
  >
    <svg viewBox="0 0 20 20" className="w-full h-full drop-shadow">
      <path
        d="M5 8 C5 4.5, 15 4.5, 15 8 Z"
        fill="#78350F"
        stroke="#FEF3C7"
        strokeWidth="1"
      />
      <line x1="10" y1="2" x2="10" y2="5" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6 8 H14 C14 13.5, 11.5 16.5, 10 17.5 C8.5 16.5, 6 13.5, 6 8 Z"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="1.2"
      />
    </svg>
  </div>
);

export const BlockedTile: React.FC<{ shape: BoardShapeId; r: number; c: number }> =
  React.memo(({ shape, r, c }) => {
    if (shape === 'fountain_atrium') {
      return (
        <div
          className="relative w-full h-full rounded-[6px] overflow-hidden select-none"
          style={{
            background:
              'linear-gradient(145deg, #9AD4D6 0%, #3E8B94 60%, #1F5B63 100%)',
            boxShadow:
              'inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(12,42,48,0.55)',
          }}
        >
          <svg viewBox="0 0 40 40" className="w-full h-full opacity-55" aria-hidden="true">
            <circle cx="20" cy="20" r="11" fill="none" stroke="#ECFEFF" strokeWidth="1.3" />
            <circle cx="20" cy="20" r="5" fill="#CFFAFE" fillOpacity="0.45" />
          </svg>
        </div>
      );
    }

    if (shape === 'twin_garden' && (c === 3 || c === 4)) {
      return (
        <div
          className="relative w-full h-full rounded-[6px] overflow-hidden select-none"
          style={{
            background:
              'linear-gradient(180deg, #5BB5B0 0%, #2B8083 55%, #1D5C63 100%)',
            boxShadow: 'inset 0 1px 2px rgba(204,251,241,0.4)',
          }}
        >
          <svg viewBox="0 0 40 40" className="w-full h-full opacity-45" aria-hidden="true">
            <path
              d="M4 14 Q 14 10, 24 14 T 38 14"
              fill="none"
              stroke="#ECFEFF"
              strokeWidth="1.4"
            />
            <path
              d="M4 26 Q 14 22, 24 26 T 38 26"
              fill="none"
              stroke="#ECFEFF"
              strokeWidth="1.3"
            />
          </svg>
        </div>
      );
    }

    // Bay-window carved stone / garden border
    const isCorner = (r === 0 || r === 7) && (c === 0 || c === 7);
    return (
      <div
        className="relative w-full h-full rounded-[6px] overflow-hidden select-none bg-[#B9A487] dark:bg-[#231B15]"
        style={{
          boxShadow:
            'inset 0 1px 2px rgba(255,255,255,0.28), inset 0 -2px 3px rgba(40,24,10,0.3)',
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full opacity-45" aria-hidden="true">
          <rect
            x="6"
            y="6"
            width="28"
            height="28"
            rx={isCorner ? 12 : 4}
            fill="none"
            stroke="#5E4A36"
            strokeWidth="1.4"
          />
          <circle cx="20" cy="20" r="3.5" fill="#4B6E52" fillOpacity="0.6" />
        </svg>
      </div>
    );
  });

BlockedTile.displayName = 'BlockedTile';

export const MossTile: React.FC<{ clearing?: boolean }> = React.memo(
  ({ clearing = false }) => (
    <div
      className={`relative w-full h-full rounded-[6px] overflow-hidden select-none ${
        clearing ? 'animate-line-clear' : ''
      }`}
      style={{
        background:
          'linear-gradient(145deg, #6BA368 0%, #3E7344 55%, #23472B 100%)',
        boxShadow:
          'inset 0 2px 2px rgba(220,252,231,0.45), inset 0 -2px 3px rgba(10,32,16,0.5)',
      }}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
        <circle cx="13" cy="17" r="6" fill="#86EFAC" fillOpacity="0.45" />
        <circle cx="24" cy="14" r="7" fill="#4ADE80" fillOpacity="0.4" />
        <circle cx="21" cy="25" r="7.5" fill="#22C55E" fillOpacity="0.35" />
        <path
          d="M11 26 C14 20, 26 20, 29 26"
          fill="none"
          stroke="#DCFCE7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
);

MossTile.displayName = 'MossTile';

export const FlowerTile: React.FC<{
  clearing?: boolean;
  justSprouted?: boolean;
}> = React.memo(({ clearing = false, justSprouted = false }) => (
  <div
    className={`relative w-full h-full rounded-[6px] overflow-hidden select-none ${
      clearing ? 'animate-line-clear' : justSprouted ? 'animate-tile-pop' : ''
    }`}
    style={{
      background:
        'linear-gradient(145deg, #FEF9C3 0%, #FDE047 52%, #CA8A04 100%)',
      boxShadow:
        'inset 0 2px 2px rgba(255,255,255,0.75), inset 0 -2px 3px rgba(113,63,18,0.45)',
    }}
  >
    <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
      <circle cx="20" cy="11" r="5" fill="#FFFBEB" stroke="#92400E" strokeWidth="1" />
      <circle cx="29" cy="20" r="5" fill="#FFFBEB" stroke="#92400E" strokeWidth="1" />
      <circle cx="20" cy="29" r="5" fill="#FFFBEB" stroke="#92400E" strokeWidth="1" />
      <circle cx="11" cy="20" r="5" fill="#FFFBEB" stroke="#92400E" strokeWidth="1" />
      <circle cx="20" cy="20" r="4.5" fill="#F59E0B" stroke="#78350F" strokeWidth="1.1" />
    </svg>
  </div>
));

FlowerTile.displayName = 'FlowerTile';

const COLORBLIND_SYMBOL_MAP: Record<MaterialType, string> = {
  honey_oak: '▲',
  glazed_ceramic: '◆',
  sea_glass: '●',
  woven_rattan: '■',
};

export const ArtisanTile: React.FC<ArtisanTileProps> = React.memo(
  ({
    material,
    tier,
    tileSkin = 'classic',
    className = '',
    ghost = false,
    highlightClear = false,
    justPlaced = false,
    clearing = false,
    special,
    hasAcornGem = false,
    compact = false,
    lightweight = false,
  }) => {
    const contextTier = React.useContext(ActiveTierContext);
    const activeTierNum = tier ?? contextTier ?? getActiveTierState();
    const { colorHex, accentHex } = getMaterialColor(material, activeTierNum);

    const animClass = clearing
      ? 'animate-line-clear'
      : justPlaced
        ? 'animate-tile-pop'
        : '';

    const opacityClass = ghost ? 'opacity-65' : 'opacity-100';
    const clearRing = highlightClear
      ? 'ring-2 ring-amber-300 dark:ring-amber-300 brightness-110'
      : '';

    if (lightweight) {
      return (
        <div
          aria-hidden="true"
          style={{ backgroundColor: colorHex }}
          className={`absolute inset-0 rounded-[5px] border border-black/15 ${opacityClass} ${animClass} ${className}`}
        >
          {special && <SpecialOverlay special={special} compact />}
          <span className="colorblind-material-symbol absolute inset-0 items-center justify-center text-xs font-bold text-black">
            {COLORBLIND_SYMBOL_MAP[material]}
          </span>
          {hasAcornGem && (
            <span className="absolute inset-0 grid place-items-center text-xs">◆</span>
          )}
        </div>
      );
    }

    const baseStyle: React.CSSProperties = {
      backgroundColor: colorHex,
      boxShadow: ghost
        ? 'none'
        : 'inset 0 1.5px 1px rgba(255,255,255,0.42), inset 0 -1.5px 2px rgba(0,0,0,0.28)',
    };

    return (
      <div
        data-tile-skin={tileSkin}
        className={`relative w-full h-full rounded-[6px] overflow-hidden select-none border border-black/15 ${animClass} ${opacityClass} ${clearRing} ${className}`}
        style={baseStyle}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[1.5px] rounded-[4px] pointer-events-none opacity-35"
          style={{ border: `1px solid ${accentHex}` }}
        />
        <span
          aria-hidden="true"
          data-testid={`colorblind-symbol-${material}`}
          className={`colorblind-material-symbol absolute pointer-events-none items-center justify-center font-bold leading-none rounded-[3px] bg-black/55 text-[#FFFBEB] border border-white/55 shadow-sm ${
            compact
              ? 'bottom-0.5 left-0.5 w-3 h-3 text-[7px]'
              : 'bottom-1 left-1 w-3.5 h-3.5 text-[9px]'
          }`}
        >
          {COLORBLIND_SYMBOL_MAP[material]}
        </span>
        {tileSkin === 'golden_lantern' && (
          <div
            aria-hidden="true"
            className="absolute inset-[1.5px] rounded-[4.5px] pointer-events-none border border-amber-300/85 shadow-[inset_0_0_8px_rgba(251,191,36,0.38)]"
          />
        )}
        {special && <SpecialOverlay special={special} compact={compact} />}
        {hasAcornGem && <AcornGemBadge compact={compact} />}
      </div>
    );
  }
);

ArtisanTile.displayName = 'ArtisanTile';

