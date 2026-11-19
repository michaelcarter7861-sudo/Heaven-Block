import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, '../android/app/src/main/AndroidManifest.xml');
const ADMOB_APP_ID = process.env.ADMOB_APP_ID;

if (!ADMOB_APP_ID) {
  console.error('ADMOB_APP_ID env var missing!');
  process.exit(1);
}

let manifest;
try {
  manifest = readFileSync(MANIFEST_PATH, 'utf-8');
} catch {
  console.error('AndroidManifest.xml not found:', MANIFEST_PATH);
  process.exit(1);
}

const ADMOB_TAG = `        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${ADMOB_APP_ID}" />`;

const EXISTING = /<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^<]*\/>/s;

let patched;
if (EXISTING.test(manifest)) {
  patched = manifest.replace(EXISTING, ADMOB_TAG);
  console.log('AdMob ID replaced.');
} else {
  patched = manifest.replace('</application>', `${ADMOB_TAG}\n    </application>`);
  console.log('AdMob ID injected.');
}

writeFileSync(MANIFEST_PATH, patched, 'utf-8');
console.log('Done:', ADMOB_APP_ID.substring(0, 20) + '...');
