# HavenBlocks — Google Play Store Release Guide (2026)

This repository is configured as an offline-first PWA + Capacitor Android game ready to package into a signed Android App Bundle (`.aab`) for Google Play.

- **Package ID (`applicationId`):** `com.havenblocks.cozyroom`
- **Initial release version:** `1.0.0` (`versionCode` is assigned by the Android workflow)
- **Privacy Policy URL (included):** `https://<your-hosted-domain>/privacy.html`

> **v2 scope lock:** `ENABLE_FULL_META` remains `false`. The Cozy Haven shop, starter bundles, gems/currency packs, Herbarium and room-restoration progression are hidden in this release and must not be advertised, sold or shown until a later version explicitly re-enables them.

---

## 1. Prerequisites & Android SDK Targets (2026 Policy)
Google Play requires new apps and updates to target **Android 16 (API 36)** with mandatory Edge-to-Edge display support (already wired via `viewport-fit=cover` + CSS `env(safe-area-inset-*)` + `SystemBars` config).

In `android/variables.gradle`, ensure:
- `compileSdkVersion = 36`
- `targetSdkVersion = 36`
- `minSdkVersion = 24`

---

## 2. Build Web Bundle & Initialize Capacitor Android
Run on a machine with Android Studio & JDK 17 installed:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
```

Generate and patch the Android project before opening or building it:

```bash
npm run prepare:assets
node scripts/patch-android-branding.mjs
npx cap sync android
```

The patcher installs the generated adaptive launcher and `#1F3A34` splash theme. Generated Android launcher/splash PNGs are intentionally ignored by Git and must be regenerated in the release environment; the checked-in PWA icons in `public/` are committed.

Open in Android Studio:

```bash
npx cap open android
```

---

## 3. v2 Rewarded Ads (Optional for Launch)
HavenBlocks v2 has **no forced ads**. All reward grants are opt-in and go through `requestRewardedAd(placement, onReward)` in `src/game/puzzleRewards.ts`; a reward is granted only after the provider returns success.

| Placement | Player-facing button | Reward |
| --- | --- | --- |
| `ROTATE` | **Watch Ad (+2 Spins)** | Restores Spins to the two-spin cap |
| `UNDO` | **Watch Ad (Undo)** | Restores one Undo |
| `REVIVE_CLEAR_3X3` | **Watch Ad: Clear 3×3 & Continue** | Clears the board centre once per run |
| `DOUBLE_DAILY_SCORE` | **Watch Ad: 2× Daily Best** | Doubles the recorded Daily best-score result |
| `POCKET_SKIP` | **Skip Rest** | Makes a resting Pocket ready immediately |

The native Android implementation uses `@capacitor-community/admob` with UMP consent handling; web/CrazyGames-style portal builds may set `window.showRewardedAd(placement) => Promise<boolean>` and use the same app code path. If no provider is configured, both paths fail closed and show “Reward unavailable” without granting charges. VIP/no-ads entitlement may bypass the ad and grant only the explicitly selected reward.

### Required production setup
1. Create an AdMob app and a **rewarded video** ad unit for this package ID.
2. Store the real **App ID** as the GitHub Actions secret `ADMOB_APP_ID` and the real rewarded unit ID as `ADMOB_REWARDED_AD_ID`. The workflow maps the latter to `VITE_ADMOB_REWARDED_ID` only for the web bundle.
3. Release builds fail closed in `scripts/verify-release-ads.mjs` when either secret is missing, malformed, or uses Google’s sample/test publisher ID. The manifest patcher injects `ADMOB_APP_ID` into `android/app/src/main/AndroidManifest.xml` after `npx cap add android`.
4. Keep UMP consent working before ad requests; do not initialize or request ads when Google reports that ads cannot be requested.
5. Test the native build with an eligible test device. Verify each placement separately: reward granted, ad closed early, no-fill/error and the disabled state before a second grant.
6. Do not show "Watch Ad" copy until inventory is ready, and do not claim the ads are available on the public web build unless a real portal provider is configured.

### Hidden legacy products — do not configure for v2
No IAP products are shown or required while `ENABLE_FULL_META = false`. In particular, do **not** create the legacy starter bundle, gem pouches/baskets/chests/vaults, bundle SKU tables or Herbarium products in Play Console for this release. The old systems remain in code for future work but their UI paths and rewards are hidden.

---

## 4. Play Console Policy & Data Safety Checklist
1. **Privacy Policy URL:** Deploy `dist/` (which includes `/privacy.html`) and paste `https://<your-domain>/privacy.html` in Play Console → App Content → Privacy Policy.
2. **Data Safety Form:**
   - **Account creation:** No (offline-first, no login).
   - **On-device save deletion:** Supported directly inside **Settings → Delete Local Save Data**.
   - **If AdMob is enabled:** Declare Device/Other IDs & Approximate Location (AdMob SDK) as collected by the third-party advertising SDK, encrypted in transit and governed by UMP consent.
   - **If launched ad-free (no AdMob SDK):** Declare **No user data collected or shared**.
3. **Android App Links / TWA (Optional):** Replace the SHA-256 fingerprint inside `public/.well-known/assetlinks.json` with the Play App Signing certificate SHA-256 from Play Console → Setup → App Signing.
4. **Minimal Permissions Audit:** Verify `android/app/src/main/AndroidManifest.xml` only includes `INTERNET` (and `VIBRATE` for haptics) — no camera, contacts, or precise location permissions.

---

## 5. Generate Signed Android App Bundle (`.aab`)
In Android Studio:

1. **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. Create or select your Upload Keystore (store it outside Git).
3. Select the **release** build variant and build `app-release.aab`.
4. Upload to **Play Console → Testing → Internal testing** first. Test on physical Android hardware: hardware Back button, Edge-to-Edge system bars, offline airplane-mode launch, Daily shortcut, splash effect with no white flash, ten rapid drags with rain and automatic Cat Nap behavior, audio/haptics/reduced-motion toggles, and all five rewarded-ad placements.
5. Promote only after the Play Console pre-launch report is clean.
