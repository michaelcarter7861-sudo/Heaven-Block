import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const publicDir = path.join(root, 'public');
const iconSvg = path.join(assets, 'icon-source.svg');
const splashSvg = path.join(assets, 'splash-source.svg');
const iconPng = path.join(assets, 'icon-only.png');
const splashPng = path.join(assets, 'splash.png');

await fs.mkdir(assets, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });

// Keep vector masters in Git; generate device-sized raster assets before each build.
await Promise.all([
  sharp(iconSvg).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(iconPng),
  sharp(splashSvg).resize(2732, 2732).png({ compressionLevel: 9 }).toFile(splashPng),
]);

await Promise.all([
  sharp(iconPng).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'pwa-192x192.png')),
  sharp(iconPng).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'pwa-512x512.png')),
  sharp(iconPng).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'apple-touch-icon.png')),
]);

const maskForeground = await sharp(iconPng).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 3, background: { r: 24, g: 57, b: 38 } },
})
  .composite([{ input: maskForeground, left: 51, top: 51 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

console.log('Generated 1024px launcher icon, 2732px native splash, and PWA icons.');
