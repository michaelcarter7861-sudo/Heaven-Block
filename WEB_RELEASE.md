# HavenBlocks v1 — web-first release

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

- On a lower-end Android device, drag at least ten pieces quickly. Check same-cell movement, canceled touches, Pocket drops, fast release, invalid placement and tap-to-place. Measure frame times in the target WebView before making a 60 FPS claim. Canvas is only a follow-up if this test still shows a bottleneck.
- Repeat a set of moves from the same Daily Seed and confirm the board and tray match. Use Undo across a tray refill and replay the move. A seed identifies the starting board and RNG stream, not the outcomes of different moves.
- Run out of moves and choose **View Board**, then **Back to results**. Verify no ad plays automatically, and that a canceled reward never changes the board. Check mute, rain, night theme, and backup export/import.
- `ENABLE_FULL_META` in `src/game/features.ts` hides the legacy room, Story, journal/Herbarium and shop. Legacy progress is still included in local backups. Export before starting a new run if you want to retain an older in-progress board: there is one active-run slot.

## Earnings rollout

1. **Prove the web build first.** Upload to itch.io or your own static host. Collect playtest feedback before integrating an ad network. Suggested pitch: “HavenBlocks is an offline-first 8×8 block puzzle. Play a shareable, deterministic daily board or Endless Zen. Zero forced ads, and you can inspect your final board. How does it feel on your phone?”
2. **Choose one provider after acceptance.** For an approved web portal build, have its SDK adapter set `window.showRewardedAd` before React mounts. The hook takes `'UNDO'` or `'REVIVE_CLEAR_3X3'` and resolves `true` **only** on the provider's earned-reward callback. Resolve `false` on cancel or no fill; do not trigger interstitial, banner or gameplay-start ads. The standalone build has no web ad SDK and offers no fake rewards. Update the privacy notice for the actual provider before shipping.
3. **Android separately.** This repo includes the native AdMob/UMP path. Before release, use test ads, verify consent, replace test identifiers with owner-provided configuration, and confirm the chosen store's current AdMob readiness eligibility and any local publisher requirements. A raw APK or web link does not establish AdMob eligibility. Do not assume portal acceptance, ad fill, revenue or a payout date. Consider Google Play once there is demand and a budget for the account fee.

Audio source and licenses: [`public/audio/CREDITS.txt`](public/audio/CREDITS.txt). Keep the notices with uploads.
