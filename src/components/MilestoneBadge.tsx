import React from 'react';
import {
  Award,
  Calendar,
  Check,
  Compass,
  Crown,
  Flame,
  Heart,
  Home,
  Layers,
  Leaf,
  Lock,
  Palette,
  Sofa,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { MilestoneBadgeIcon, MilestoneBadgeTier } from '../game/journal';

interface MilestoneBadgeProps {
  icon: MilestoneBadgeIcon;
  tier: MilestoneBadgeTier;
  label: string;
  progressPct: number; // 0..100
  unlocked: boolean;
  claimed: boolean;
  claimable: boolean;
  size?: 'sm' | 'md';
}

const TIER_STYLES: Record<
  MilestoneBadgeTier,
  {
    ringStroke: string;
    outerFill: string;
    innerFill: string;
    iconColor: string;
    ribbonBg: string;
    ribbonText: string;
    tierName: string;
  }
> = {
  bronze: {
    ringStroke: '#B4693A',
    outerFill: 'from-[#D99B66] via-[#B8703E] to-[#7D4722]',
    innerFill: 'bg-[#5A3219] dark:bg-[#3A2010]',
    iconColor: 'text-[#FDE6CE]',
    ribbonBg: 'bg-[#8C4D26] text-[#FFF4E6]',
    ribbonText: 'Bronze',
    tierName: 'Bronze Seal',
  },
  silver: {
    ringStroke: '#7C938B',
    outerFill: 'from-[#DCE7E2] via-[#9BB1A8] to-[#5B726A]',
    innerFill: 'bg-[#264239] dark:bg-[#192E27]',
    iconColor: 'text-[#E9F5F0]',
    ribbonBg: 'bg-[#35594D] text-[#F1FAF6]',
    ribbonText: 'Silver',
    tierName: 'Silver Seal',
  },
  gold: {
    ringStroke: '#D99118',
    outerFill: 'from-[#FDE08D] via-[#E2A52D] to-[#9E650D]',
    innerFill: 'bg-[#422B09] dark:bg-[#2A1B05]',
    iconColor: 'text-[#FFF2C2]',
    ribbonBg: 'bg-[#B4730E] text-[#FFF9E6]',
    ribbonText: 'Gold',
    tierName: 'Gold Seal',
  },
  heirloom: {
    ringStroke: '#EAB308',
    outerFill: 'from-[#FEF08A] via-[#D97706] to-[#1E3A2F]',
    innerFill: 'bg-[#162C24] dark:bg-[#0E1E18]',
    iconColor: 'text-[#FDE68A]',
    ribbonBg: 'bg-[#1E3A2F] text-[#FDE68A]',
    ribbonText: 'Heirloom',
    tierName: 'Heirloom Seal',
  },
};

function renderBadgeIcon(icon: MilestoneBadgeIcon, className: string) {
  switch (icon) {
    case 'sofa':
      return <Sofa className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'timber':
      return <Award className={className} />;
    case 'firefly_crown':
      return <Crown className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'acorn':
      return <Sparkles className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'palette':
      return <Palette className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'heart':
      return <Heart className={className} />;
  }
}

export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({
  icon,
  tier,
  label,
  progressPct,
  unlocked,
  claimed,
  claimable,
  size = 'md',
}) => {
  const style = TIER_STYLES[tier];
  const dim = size === 'sm' ? 48 : 58;
  const radius = size === 'sm' ? 21 : 25;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, progressPct));
  const strokeDashoffset = circumference * (1 - clampedPct / 100);
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className="relative inline-flex flex-col items-center select-none shrink-0"
      aria-label={`${label} (${style.tierName}, ${
        claimed ? 'Collected' : claimable ? 'Ready to collect' : `${clampedPct}%`
      })`}
    >
      <div
        className={`relative flex items-center justify-center rounded-full transition-transform ${
          claimable
            ? 'ring-2 ring-amber-400/90 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
            : ''
        }`}
        style={{ width: dim, height: dim }}
      >
        {/* Outer SVG Progress Ring */}
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="text-[#D4C0A3]/70 dark:text-[#3A2B1F]"
          />
          {clampedPct > 0 && (
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              fill="none"
              stroke={unlocked ? style.ringStroke : '#8E785D'}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          )}
        </svg>

        {/* Embossed Artisan Medallion Core */}
        {unlocked ? (
          <div
            className={`relative flex items-center justify-center rounded-full bg-gradient-to-br p-[2.5px] shadow-md ${style.outerFill}`}
            style={{ width: dim - 10, height: dim - 10 }}
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center border border-white/25 ${style.innerFill}`}
            >
              {renderBadgeIcon(icon, `${iconSize} ${style.iconColor}`)}
            </div>
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center rounded-full border border-dashed bg-[#E6D7BE] border-[#BFA886] text-[#8A745A] dark:bg-[#17120E] dark:border-[#3D2E22] dark:text-[#6E5C4B]"
            style={{ width: dim - 10, height: dim - 10 }}
          >
            {renderBadgeIcon(icon, `${iconSize} opacity-55`)}
          </div>
        )}

        {/* Corner Status Pip (Collected Check / Claimable Sparkle / Locked) */}
        {claimed ? (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-600 text-white border border-[#FAF5EC] dark:border-[#191410] shadow-sm"
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        ) : claimable ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-amber-400 text-amber-950 border border-[#FAF5EC] dark:border-[#191410] shadow-sm"
          >
            <Sparkles className="w-2.5 h-2.5" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-[#D8C5A8] text-[#6E5A46] border border-[#FAF5EC] dark:bg-[#2A2018] dark:text-[#8E7A66] dark:border-[#191410]"
          >
            <Lock className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Tiny Embossed Badge Label Ribbon */}
      {size === 'md' && (
        <span
          className={`mt-1 px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider leading-tight ${
            unlocked
              ? style.ribbonBg
              : 'bg-[#E2D2B8] text-[#7A654F] dark:bg-[#241C16] dark:text-[#8E7A66]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
