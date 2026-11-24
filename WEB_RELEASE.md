# HavenBlocks v2 — web-first release

## Build and playtest

Use Node 22+ and run:

```sh
npm install
npm run lint
npm test
npm run build
npm run preview -- --host 0.0.0.0
```

`dist/` is the deployable output. On itch.io, zip **the contents** of `dist/` with `index.html` at the ZIP root, choose HTML, and mark the upload playable in the browser. For a standalone HTTPS host, publish `dist/` as a static site. The web build uses relative asset and PWA paths. Test in the actual itch.io iframe: browser install, service-worker registration and persistent storage can be restricted in embedded contexts. For install/offline play, prefer the standalone HTTPS URL and let it finish caching on the first online visit.

Before public promotion:

- `public/pwa-maskable-512x512.png` uses the same inset forest artwork as the normal icon: the opaque `#1F3A34` background fills the square while the essential cat/blocks/leaf stay inside the central maskable safe zone. Verify the launcher on a physical Android device; PWA metadata cannot guarantee every OEM mask.
- On a lower-end Android device, drag at least ten pieces quickly. Check same-cell movement, canceled touches, Pocket drops, fast release, invalid placement and tap-to-place. Measure frame times in the target WebView before making a 60 FPS claim. Canvas is only a follow-up if this test still shows a bottleneck.
- Repeat a set of moves from the same Daily Seed and confirm the board and tray match. Use Undo across a tray refill and replay the move. A seed identifies the starting board and RNG stream, not the outcomes of different moves.
- Run out of moves and choose **View Board**, then **Back to results**. Verify no ad plays automatically, and that a canceled reward never changes the board. Check mute, rain, night theme, and backup export/import.
- `ENABLE_FULL_META` in `src/game/features.ts` hides the legacy room, Story, journal/Herbarium and shop. Legacy progress is still included in local backups. Export before starting a new run if you want to retain an older in-progress board: there is one active-run slot.

## Earnings rollout

1. **Prove the web build first.** Upload to itch.io or your own static host. Collect playtest feedback before integrating an ad network. Suggested pitch: “HavenBlocks is an offline-first 8×8 block puzzle. Play a shareable, deterministic daily board or Endless Zen. Zero forced ads, and you can inspect your final board. How does it feel on your phone?”
2. **Choose one provider after acceptance.** For an approved web portal build, have its SDK adapter set `window.showRewardedAd` before React mounts. The hook takes `'ROTATE'`, `'UNDO'`, `'REVIVE_CLEAR_3X3'`, `'DOUBLE_DAILY_SCORE'`, or `'POCKET_SKIP'` and resolves `true` **only** on the provider's earned-reward callback. Resolve `false` on cancel or no fill; do not trigger interstitial, banner or gameplay-start ads. The standalone build has no web ad SDK and offers no fake rewards. Update the privacy notice for the actual provider before shipping.
3. **Android separately.** This repo includes the native AdMob/UMP path. Before release, use test ads, verify consent, and store owner-provided `ADMOB_APP_ID` and `ADMOB_REWARDED_AD_ID` in GitHub Actions secrets; the release workflow rejects missing, malformed or Google test IDs. Confirm the chosen store's current AdMob readiness eligibility and any local publisher requirements. A raw APK or web link does not establish AdMob eligibility. Do not assume portal acceptance, ad fill, revenue or a payout date. Consider Google Play once there is demand and a budget for the account fee.

Native share links: Capacitor serves Android from `https://localhost`, so the app only emits an absolute “Play this same board” URL when the build provides `VITE_SHARE_BASE_URL` (the Android workflow maps the repository variable `SHARE_BASE_URL`). Otherwise it shares the spoiler-free result text and seed.

Audio source and licenses: [`public/audio/CREDITS.txt`](public/audio/CREDITS.txt). Keep the notices with uploads.

## Included v2 optional extras
- Daily runs advance through milestone tiers at 1,500, 3,000, 5,000 and 10,000 points. `Daily Goal Complete ✓` is the first tier; later tiers remain visible in the active Daily progress strip.
- A completed rewarded ad can double the recorded Daily best-score result (`DOUBLE_DAILY_SCORE`) or make a resting Pocket ready immediately (`POCKET_SKIP`). VIP/no-ads users receive those opt-in grants without watching an ad. Cancel, no-fill, error or an incomplete reward grants nothing.
- Cat Nap appears automatically in Endless after every 18 successful placements when an empty 2×2 corner exists; it is not a setting and cannot be farmed through Undo to trigger repeatedly.

## v2 phone acceptance checks

- Confirm a new run has **one Spin and one Undo**, with no passive refill. A completed opt-in ad restores two Spins or one Undo; the same fail-closed path serves the Daily double and Pocket skip rewards. Reject/cancel/no-fill must leave charges unchanged. Test capped inventories on old saves, and play two successful placements between Pocket swaps.
- At game over, inspect the board first; verify a completed revive restores play and cannot be used again in that run (including after reload). The standard web build reports unavailable when no provider is configured.
- At 1,500 Daily points the first completion badge appears; verify the 3,000 / 5,000 / 10,000 milestone tiers and the three atmosphere thresholds with the Night Candle override; Cat Nap affects Endless only.
- Test ten quick drags with rain active and while Cat Nap settles, on a physical Android phone. Independently toggle SFX and Rain Ambience; check vibration and reduced-motion preferences. Confirm the launcher icon and splash in both Android light and dark system modes.
- Regenerate branding with `npm run prepare:assets`. CI runs the Capacitor generator and `scripts/patch-android-branding.mjs`; generated native PNG intermediates are ignored, while PWA launcher PNGs are checked in.
