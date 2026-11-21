# HavenBlocks — Google Play Store Release Guide (2026)

This repository is configured as an offline-first PWA + Capacitor Android game ready to package into a signed Android App Bundle (`.aab`) for Google Play.

- **Package ID (`applicationId`):** `com.havenblocks.cozyroom`
- **Version:** `1.0.0` (`versionCode: 1`)
- **Privacy Policy URL (included):** `https://<your-hosted-domain>/privacy.html`

---

## 1. Prerequisites & Android SDK Targets (2026 Policy)
Google Play requires new apps and updates to target **Android 16 (API 36)** with mandatory Edge-to-Edge display support (already wired via `viewport-fit=cover` + CSS `env(safe-area-inset-*)` + `SystemBars` config).

In `android/variables.gradle`, ensure:
- `compileSdkVersion = 36`
- `targetSdkVersion = 36`
- `minSdkVersion = 24`

---

## 2. Build Web Bundle & Initialize Capacitor Android
Run in your local machine / CI environment with Android Studio & JDK 17+ installed:

```bash
npm install
npm run build

# Install Capacitor core + Android platform + lifecycle plugins
npm install @capacitor/core @capacitor/android @capacitor/app @capacitor/status-bar @capacitor/splash-screen
npm install -D @capacitor/cli

# Create Android project using capacitor.config.json
npx cap add android
npx cap sync android
```

To rebuild and sync after any web change:
```bash
npm run cap:sync
```

Open in Android Studio:
```bash
npx cap open android
```

---

## 3. Native Monetization & Review Plugins (Optional for Launch)
`src/game/monetization.ts` and `src/game/nativeBridge.ts` automatically detect Capacitor plugins at runtime (`window.Capacitor.Plugins.*`) and fall back gracefully on web:

| Feature | Plugin / Bridge | Notes |
| --- | --- | --- |
| Rewarded Ads + UMP GDPR | `@capacitor-community/admob` | Set your real AdMob App ID in `AndroidManifest.xml` & Rewarded Ad Unit ID before release. |
| Google Play Billing (v8+) | Custom / RevenueCat / `capacitor-purchases` exposed as `Capacitor.Plugins.Billing` | Implement `purchaseProduct({ productId })` and `restorePurchases()` matching the SKU table below. |
| Play In-App Review | `@capacitor-community/in-app-review` (`Capacitor.Plugins.InAppReview.requestReview`) | Triggered once at 4th Cozy Room upgrade (never on a loss). |

### Exact Play Console In-App Product SKUs (`src/game/shop.ts`)
Create these exact Product IDs in **Google Play Console → Monetize → Products → In-app products**:

| Product ID | Type | Price | Contents |
| --- | --- | --- | --- |
| `bundle_cozy_starter_v1` | One-time (Non-consumable) | $3.99 | No Ads VIP + 300 Gems + Lop Bunny Pet |
| `bundle_master_artisan_v1` | One-time (Non-consumable) | $7.99 | 800 Gems + Rainy Conservatory Window Theme + 5 Undos |
| `gems_pouch_80` | Consumable | $0.99 | 80 Cozy Gems |
| `gems_basket_450` | Consumable | $4.99 | 450 Cozy Gems (Best Value) |
| `gems_chest_1000` | Consumable | $9.99 | 1,000 Cozy Gems |
| `gems_vault_2400` | Consumable | $19.99 | 2,400 Cozy Gems |

---

## 4. Play Console Policy & Data Safety Checklist
1. **Privacy Policy URL:** Deploy `dist/` (which includes `/privacy.html`) and paste `https://<your-domain>/privacy.html` in Play Console → App Content → Privacy Policy.
2. **Data Safety Form:**
   - **Account creation:** No (offline-first, no login).
   - **On-device save deletion:** Supported directly inside **Settings → Delete Local Save Data**.
   - **If AdMob is enabled:** Declare Device/Other IDs & Approximate Location (AdMob SDK) as collected by third-party advertising SDK, encrypted in transit, and governed by UMP consent.
   - **If launched ad-free (no AdMob SDK):** Declare **No user data collected or shared**.
3. **Android App Links / TWA (Optional):** Replace the SHA-256 fingerprint inside `public/.well-known/assetlinks.json` with your **Play App Signing** certificate SHA-256 from Play Console → Setup → App Signing.
4. **Minimal Permissions Audit:** Verify `android/app/src/main/AndroidManifest.xml` only includes `INTERNET` (and `VIBRATE` for haptics) — no camera, contacts, or precise location permissions.

---

## 5. Generate Signed Android App Bundle (`.aab`)
In Android Studio:
1. **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. Create or select your **Upload Keystore** (store securely outside git).
3. Select **release** build variant → build `app-release.aab`.
4. Upload to **Google Play Console → Testing → Internal testing** first, test hardware Back button, Edge-to-Edge status bar, offline Airplane Mode launch, Daily Puzzle shortcut, and Play Billing test cards, then promote to **Production**.
