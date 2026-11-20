import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const iconPng = path.join(root, 'assets', 'icon-only.png');
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
   '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">#0B2418</color>\n</resources>\n'],
  [path.join(androidRes, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive],
  [path.join(androidRes, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive],
];
for (const [file, content] of outputs) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
}
console.log('Applied the supplied HavenBlocks launcher artwork to legacy and adaptive Android icons.');
