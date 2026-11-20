import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const publicDir = path.join(root, 'public');
const iconSource = path.join(assets, 'icon-master.webp');
const splashBackground = path.join(assets, 'splash-background.svg');
const iconPng = path.join(assets, 'icon-only.png');
const splashPng = path.join(assets, 'splash.png');

await fs.mkdir(assets, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });
await Promise.all([fs.access(iconSource), fs.access(splashBackground)]);

// Keep the exact supplied HavenBlocks artwork as the launcher icon. Clip the
// four black outer corners to transparent so the Android adaptive mask is clean.
const iconBase = await sharp(iconSource).resize(1024, 1024).png().toBuffer();
const roundedMask = Buffer.from(
  '<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="1024" height="1024" rx="194" fill="#fff"/></svg>'
);
const iconBuffer = await sharp(iconBase)
  .composite([{ input: roundedMask, blend: 'dest-in' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

const splashBase = await sharp(splashBackground).resize(2732, 2732).png().toBuffer();
const splashLogo = await sharp(iconBuffer).resize(1020, 1020).png().toBuffer();
await Promise.all([
  sharp(iconBuffer).png({ compressionLevel: 9 }).toFile(iconPng),
  sharp(splashBase)
    .composite([{ input: splashLogo, left: 856, top: 610 }])
    .png({ compressionLevel: 9 })
    .toFile(splashPng),
]);

await Promise.all([
  sharp(iconPng).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'pwa-192x192.png')),
  sharp(iconPng).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'pwa-512x512.png')),
  sharp(iconPng).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'apple-touch-icon.png')),
]);

const maskForeground = await sharp(iconPng).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 3, background: { r: 11, g: 36, b: 24 } },
})
  .composite([{ input: maskForeground, left: 51, top: 51 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

console.log('Generated the supplied launcher icon, portrait-safe green-and-gold splash, and PWA assets.');
