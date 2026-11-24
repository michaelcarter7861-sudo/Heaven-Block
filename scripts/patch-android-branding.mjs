import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const iconPng = path.join(root, 'assets', 'icon-foreground.png');
const manifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

await fs.access(manifest);
await fs.access(iconPng);
const foreground = await fs.readFile(iconPng);
const densities = [['mdpi',108],['hdpi',162],['xhdpi',216],['xxhdpi',324],['xxxhdpi',432]];

for (const [density, size] of densities) {
  const dir = path.join(androidRes, 'drawable-' + density);
  await fs.mkdir(dir, { recursive: true });
  await sharp(foreground)
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
  '  <background android:drawable="@color/ic_launcher_background"/>\n' +
  '  <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n' +
  '</adaptive-icon>\n';
const outputs = [
  [path.join(androidRes, 'values', 'ic_launcher_background.xml'),
   '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">#1F3A34</color>\n</resources>\n'],
  [path.join(androidRes, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive],
  [path.join(androidRes, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive],
];
for (const [file, content] of outputs) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
}
const stylesPath = path.join(androidRes, 'values', 'styles.xml');
const styles = await fs.readFile(stylesPath, 'utf8');
if (!styles.includes('name="windowSplashScreenBackground"')) {
  const launch = '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">';
  if (!styles.includes(launch)) throw new Error('Missing Capacitor splash theme');
  await fs.writeFile(stylesPath, styles.replace(launch, launch + `
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>`));
}
console.log('Applied HavenBlocks v2 adaptive launcher and Android splash theme.');
