import React, { useState } from 'react';
import {
  Check,
  CloudRain,
  Film,
  Gem,
  Rabbit,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  Undo2,
  X,
} from 'lucide-react';
import { isNativePlatform } from '../game/monetization';
import {
  FREE_GEMS_AD_AMOUNT,
  GEM_SHOP_ITEMS,
  isPremiumItemOwned,
  SHOP_BUNDLES,
  SHOP_GEM_PACKS,
} from '../game/shop';
import type {
  GemShopItemId,
  PetKind,
  ShopTabId,
  StoreProductId,
  TileSkinId,
  WindowThemeId,
} from '../game/types';

interface ShopModalProps {
  initialTab?: ShopTabId;
  cozyGems: number;
  noAdsOwned: boolean;
  unlockedPremiumItems: string[];
  activePet: PetKind;
  activeTileSkin: TileSkinId;
  activeWindowTheme: WindowThemeId;
  onPurchaseStoreProduct: (
    productId: StoreProductId
  ) => Promise<{ ok: boolean; message: string }>;
  onWatchFreeGemsAd: () => Promise<{ ok: boolean; message: string }>;
  onPurchaseGemItem: (itemId: GemShopItemId) => { ok: boolean; message: string };
  onEquipCosmetic: (
    kind: 'pet_lop_bunny' | 'theme_rainy_window' | 'skin_golden_lantern'
  ) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  initialTab = 'shop',
  cozyGems,
  noAdsOwned,
  unlockedPremiumItems,
  activePet,
  activeTileSkin,
  activeWindowTheme,
  onPurchaseStoreProduct,
  onWatchFreeGemsAd,
  onPurchaseGemItem,
  onEquipCosmetic,
  onClose,
}) => {
  const isNative = isNativePlatform();
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleStoreBuy = async (productId: StoreProductId) => {
    if (busyProductId || !isNative) return;
    setBusyProductId(productId);
    const res = await onPurchaseStoreProduct(productId);
    setFeedback(res);
    setBusyProductId(null);
  };

  const handleWatchFreeGems = async () => {
    if (busyProductId || !isNative) return;
    setBusyProductId('free_gems_ad');
    setFeedback(null);
    try {
      const res = await onWatchFreeGemsAd();
      setFeedback(res);
    } catch {
      setFeedback({
        ok: false,
        message: 'The rewarded ad could not be opened. Please try again later.',
      });
    } finally {
      setBusyProductId(null);
    }
  };

  const handleGemBuy = (itemId: GemShopItemId) => {
    const res = onPurchaseGemItem(itemId);
    setFeedback(res);
  };

  const renderItemIcon = (itemId: GemShopItemId) => {
    switch (itemId) {
      case 'pet_lop_bunny':
        return <Rabbit className="w-5 h-5 text-amber-700 dark:text-amber-300" />;
      case 'theme_rainy_window':
        return <CloudRain className="w-5 h-5 text-sky-700 dark:text-sky-300" />;
      case 'skin_golden_lantern':
        return <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-300" />;
      case 'refill_undo_3':
        return <Undo2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />;
      case 'refill_rotate_3':
        return <RotateCw className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />;
      case 'mystery_seed_pouch':
        return <Sprout className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />;
    }
  };

  const isCosmeticEquipped = (itemId: GemShopItemId): boolean => {
    if (itemId === 'pet_lop_bunny') return activePet === 'lop_bunny';
    if (itemId === 'theme_rainy_window') {
      return activeWindowTheme === 'rainy_conservatory';
    }
    if (itemId === 'skin_golden_lantern') {
      return activeTileSkin === 'golden_lantern';
    }
    return false;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cozy Gem Shop"
      data-testid="shop-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60"
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden bg-[#FAF5EC] border-[#D4C0A3] text-[#2A1F15] dark:bg-[#191410] dark:border-[#3D2E22] dark:text-[#F5EDE1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#E5D4BA] dark:border-[#2E2218]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold leading-tight">
                Cozy Atelier Shop
              </h2>
              {!isNative && (
                <span
                  data-testid="coming-to-android-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-emerald-100 border-emerald-400/70 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-200"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Coming to Android</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6E5A46] dark:text-[#A4907B]">
              Exclusive companions, atmospheric themes &amp; tactical refills
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              data-testid="shop-gem-balance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono-num text-xs font-bold bg-[#EFE4D2] border-[#D4C0A3] text-[#1E3A2F] dark:bg-[#241C16] dark:border-[#4A3828] dark:text-sky-300"
            >
              <Gem className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{cozyGems.toLocaleString()}</span>
            </div>
            <button
              type="button"
              data-testid="close-shop-btn"
              onClick={onClose}
              aria-label="Close Cozy Shop"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6E5A46] hover:bg-[#EFE4D2] dark:text-[#A4907B] dark:hover:bg-[#241C16]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Tab Segmented Bar: Bundles | Gems | Shop */}
        <div className="px-5 pt-3">
          <div
            role="tablist"
            aria-label="Cozy Shop categories"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border bg-[#EFE4D2] border-[#D4C0A3] dark:bg-[#110D0A] dark:border-[#33251B]"
          >
            {(
              [
                { id: 'bundles', label: 'Bundles' },
                { id: 'gems', label: 'Gems' },
                { id: 'shop', label: 'Shop' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`shop-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#1E3A2F] text-[#FDF8F2] shadow-sm dark:bg-amber-600 dark:text-[#120D08]'
                      : 'text-[#5C4936] hover:text-[#2A1F15] dark:text-[#B4A08A] dark:hover:text-[#F5EDE1]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            data-testid="shop-feedback-msg"
            className={`mx-5 mt-3 px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.ok
                ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-700/60 dark:text-emerald-200'
                : 'bg-amber-100/90 border-amber-400 text-amber-950 dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-200'
            }`}
          >
            <span>{feedback.message}</span>
            {!feedback.ok && activeTab === 'shop' && (
              <button
                type="button"
                onClick={() => setActiveTab('gems')}
                className="underline font-bold shrink-0"
              >
                Get Gems
              </button>
            )}
          </div>
        )}

        {/* Scrollable Tab Panel */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {activeTab === 'bundles' &&
            SHOP_BUNDLES.map((bundle) => {
              const bundleOwned =
                bundle.productId === 'bundle_cozy_starter_v1'
                  ? noAdsOwned &&
                    isPremiumItemOwned(unlockedPremiumItems, 'pet_lop_bunny')
                  : isPremiumItemOwned(
                      unlockedPremiumItems,
                      'theme_rainy_window'
                    );
              const isBusy = busyProductId === bundle.productId;
              return (
                <div
                  key={bundle.productId}
                  data-testid={`bundle-card-${bundle.productId}`}
                  className="rounded-2xl p-4 border bg-[#F3E9D8] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#35271D]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {bundle.badge ?? 'Special Bundle'}
                      </div>
                      <h3 className="font-display text-lg font-bold leading-snug">
                        {bundle.name}
                      </h3>
                      <p className="text-xs text-[#5C4936] dark:text-[#B4A08A]">
                        {bundle.summary}
                      </p>
                    </div>
                    {isNative ? (
                      <span className="font-mono-num text-sm font-bold text-[#1E3A2F] dark:text-amber-300 shrink-0">
                        {bundle.priceLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-[#FAF5EC] border-[#C9B292] text-[#6E5A46] dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-amber-300 shrink-0">
                        Coming to Android
                      </span>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs mb-3.5 text-[#3F3021] dark:text-[#DFD1BF]">
                    {bundle.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  {bundleOwned ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Bundle Active on Account</span>
                    </div>
                  ) : isNative ? (
                    <button
                      type="button"
                      disabled={Boolean(busyProductId)}
                      data-testid={`buy-${bundle.productId}`}
                      onClick={() => handleStoreBuy(bundle.productId)}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
                    >
                      <span>
                        {isBusy
                          ? 'Processing Checkout...'
                          : `Unlock Bundle · ${bundle.priceLabel}`}
                      </span>
                    </button>
                  ) : (
                    <div
                      data-testid={`web-badge-${bundle.productId}`}
                      className="w-full inline-flex items-center justify-between gap-2 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border bg-[#FAF5EC] border-[#C9B292] text-[#5C4936] dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-[#C4B29D]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-300" />
                        <span>Coming to Android Play Store</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('shop')}
                        className="underline font-bold text-[#1E3A2F] dark:text-amber-300"
                      >
                        Spend Starter Gems →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {activeTab === 'gems' && (
            <>
              {isNative ? (
                <div className="rounded-2xl p-3.5 border flex items-center justify-between gap-3 bg-[#EFE4D2] border-[#C9B292] dark:bg-[#221A14] dark:border-[#4A3828]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                      <Gem className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">
                        Free {FREE_GEMS_AD_AMOUNT} Gems
                      </div>
                      <div className="text-xs text-[#6E5A46] dark:text-[#A4907B]">
                        Watch a short preview {noAdsOwned ? '(Instant VIP)' : 'ad'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busyProductId)}
                    data-testid="shop-free-gems-ad-btn"
                    onClick={handleWatchFreeGems}
                    className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>{noAdsOwned ? 'Claim +10' : 'Watch Ad'}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl p-3.5 border flex items-center justify-between gap-3 bg-[#EFE4D2] border-[#C9B292] dark:bg-[#221A14] dark:border-[#4A3828]">
                  <div className="text-xs text-[#5C4936] dark:text-[#C4B29D]">
                    <span className="font-bold text-[#2A1F15] dark:text-[#F5EDE1]">
                      Web Demo Mode:
                    </span>{' '}
                    You start with 50 welcome Cozy Gems to spend in the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('shop')}
                      className="underline font-bold text-[#1E3A2F] dark:text-amber-300"
                    >
                      Shop tab
                    </button>
                    . Google Play Gem packs are Coming to Android.
                  </div>
                </div>
              )}

              {/* 4 Gem Packs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SHOP_GEM_PACKS.map((pack) => {
                  const isBusy = busyProductId === pack.productId;
                  return (
                    <div
                      key={pack.productId}
                      data-testid={`gem-pack-${pack.productId}`}
                      className="rounded-2xl p-3.5 border flex flex-col justify-between gap-3 bg-[#F3E9D8] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#35271D]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 font-mono-num text-sm font-bold text-sky-800 dark:text-sky-300">
                            <Gem className="w-4 h-4" />
                            {pack.gems.toLocaleString()}
                          </span>
                          {pack.badge && (
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                              {pack.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold">
                          {pack.name}
                        </div>
                      </div>
                      {isNative ? (
                        <button
                          type="button"
                          disabled={Boolean(busyProductId)}
                          data-testid={`buy-${pack.productId}`}
                          onClick={() => handleStoreBuy(pack.productId)}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl font-mono-num text-xs font-semibold border transition-colors bg-[#FAF5EC] border-[#C9B292] text-[#1E3A2F] hover:bg-[#E7D8C0] disabled:opacity-60 dark:bg-[#221A14] dark:border-[#4A3828] dark:text-amber-200 dark:hover:bg-[#2B2119]"
                        >
                          {isBusy ? 'Processing...' : pack.priceLabel}
                        </button>
                      ) : (
                        <span
                          data-testid={`web-pack-badge-${pack.productId}`}
                          className="w-full min-h-[36px] px-3 py-1.5 rounded-xl text-[11px] font-semibold border inline-flex items-center justify-center gap-1.5 bg-[#FAF5EC] border-[#C9B292] text-[#6E5A46] dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-amber-200/80"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Coming to Android</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-2.5">
              {GEM_SHOP_ITEMS.map((item) => {
                const owned =
                  item.durable &&
                  isPremiumItemOwned(unlockedPremiumItems, item.id);
                const equipped = owned && isCosmeticEquipped(item.id);
                const canAfford = cozyGems >= item.costGems;

                return (
                  <div
                    key={item.id}
                    data-testid={`gem-shop-item-${item.id}`}
                    className="rounded-2xl p-3.5 border flex items-center justify-between gap-3 bg-[#F3E9D8] border-[#D4C0A3] dark:bg-[#14100C] dark:border-[#35271D]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FAF5EC] border border-[#D4C0A3] dark:bg-[#221A14] dark:border-[#3D2E22]">
                        {renderItemIcon(item.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold leading-snug">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#6E5A46] dark:text-[#A4907B]">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {owned ? (
                      <button
                        type="button"
                        data-testid={`equip-${item.id}`}
                        onClick={() => {
                          if (
                            item.id === 'pet_lop_bunny' ||
                            item.id === 'theme_rainy_window' ||
                            item.id === 'skin_golden_lantern'
                          ) {
                            onEquipCosmetic(item.id);
                          }
                        }}
                        className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 border transition-colors ${
                          equipped
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-700/60 dark:text-emerald-200'
                            : 'bg-[#FAF5EC] border-[#C9B292] text-[#2A1F15] hover:bg-[#E7D8C0] dark:bg-[#221A14] dark:border-[#4A3828] dark:text-[#F5EDE1]'
                        }`}
                      >
                        {equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`buy-gem-item-${item.id}`}
                        onClick={() => handleGemBuy(item.id)}
                        className={`inline-flex items-center gap-1 min-h-[40px] px-3.5 py-1.5 rounded-xl font-mono-num text-xs font-semibold shrink-0 transition-colors ${
                          canAfford
                            ? 'text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D] dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-[#120D08]'
                            : 'border bg-[#EFE4D2] border-[#D4C0A3] text-[#7A654F] hover:bg-[#E5D4BA] dark:bg-[#221A14] dark:border-[#3D2E22] dark:text-[#9D8A76]'
                        }`}
                      >
                        <Gem
                          className={`w-3.5 h-3.5 ${
                            canAfford
                              ? 'text-sky-300 dark:text-sky-950'
                              : 'text-sky-700 dark:text-sky-400'
                          }`}
                        />
                        <span>{item.costGems}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
