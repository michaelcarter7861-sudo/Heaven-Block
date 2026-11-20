import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const publicDir = path.join(root, 'public');
const iconPngSource = path.join(assets, 'icon-master.png');
const splashPngSource = path.join(assets, 'splash-source.png');
const iconSvgFallback = path.join(assets, 'icon-source.svg');
const splashSvgFallback = path.join(assets, 'splash-source.svg');
const iconPng = path.join(assets, 'icon-only.png');
const splashPng = path.join(assets, 'splash.png');

await fs.mkdir(assets, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });

// Prefer the uploaded woodland icon and custom portrait-safe splash when those
// PNG masters are present. Keep the original vector assets as a safe fallback
// so Android builds never fail while the new binary masters are being added.
const hasIconPng = await fs.access(iconPngSource).then(() => true).catch(() => false);
const hasSplashPng = await fs.access(splashPngSource).then(() => true).catch(() => false);

if (hasIconPng) {
  const iconBase = await sharp(iconPngSource).resize(1024, 1024).png().toBuffer();
  const roundedMask = Buffer.from(
    '<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="1024" height="1024" rx="194" fill="#fff"/></svg>'
  );
  await sharp(iconBase).composite([{ input: roundedMask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 }).toFile(iconPng);
} else {
  await fs.access(iconSvgFallback);
  await sharp(iconSvgFallback).resize(1024, 1024)
    .png({ compressionLevel: 9 }).toFile(iconPng);
}

if (hasSplashPng) {
  await sharp(splashPngSource).resize(2732, 2732, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 }).toFile(splashPng);
} else {
  await fs.access(splashSvgFallback);
  await sharp(splashSvgFallback).resize(2732, 2732)
    .png({ compressionLevel: 9 }).toFile(splashPng);
}

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

console.log(hasIconPng && hasSplashPng
  ? 'Generated the supplied HavenBlocks woodland icon and splash assets.'
  : 'Generated fallback branding; add assets/icon-master.png and assets/splash-source.png to activate the supplied artwork.');
