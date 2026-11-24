import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const publicDir = path.join(root, 'public');
const forest = '#1F3A34';
const foreground = await fs.readFile(path.join(assets, 'icon-foreground.svg'), 'utf8');
const art = foreground.slice(foreground.indexOf('<defs>'), foreground.lastIndexOf('</svg>'));
const svg = (size, content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`;
const backdrop = (size, radius = 0) => `<defs><radialGradient id="forest"><stop stop-color="#486354"/><stop offset="1" stop-color="${forest}"/></radialGradient></defs><rect width="${size}" height="${size}" rx="${radius}" fill="url(#forest)"/>`;
const icon = svg(1024, backdrop(1024) + art);
const splash = svg(2732, `<rect width="2732" height="2732" fill="${forest}"/><g transform="translate(990 939) scale(.735)">${art}</g><text x="1366" y="1614" text-anchor="middle" fill="#F6EFE4" font-family="Georgia, DejaVu Serif, serif" font-size="140" font-weight="bold">HavenBlocks</text><text x="1366" y="1718" text-anchor="middle" fill="#E1C8A4" font-family="DejaVu Sans, sans-serif" font-size="45" letter-spacing="8">HONEST COZY BLOCK PUZZLE</text>`);
const png = (source, size, output) => sharp(Buffer.from(source)).resize(size).png({ compressionLevel: 9 }).toFile(output);

await Promise.all([
  fs.writeFile(path.join(assets, 'icon-source.svg'), icon),
  fs.writeFile(path.join(assets, 'splash-source.svg'), splash),
  fs.writeFile(path.join(assets, 'splash-background.svg'), svg(2732, `<rect width="2732" height="2732" fill="${forest}"/>`)),
  fs.writeFile(path.join(publicDir, 'icon.svg'), icon),
  png(svg(1024, backdrop(1024, 192) + art), 1024, path.join(assets, 'icon-only.png')),
  // The source art is inset to ~55%; the fully opaque icon is safe under maskable crops.
  png(svg(1024, `<g transform="translate(72 72) scale(.86)">${art}</g>`), 1024, path.join(assets, 'icon-foreground.png')),
  png(svg(1024, backdrop(1024)), 1024, path.join(assets, 'icon-background.png')),
  png(splash, 2732, path.join(assets, 'splash.png')),
  png(splash, 2732, path.join(assets, 'splash-dark.png')),
  png(icon, 192, path.join(publicDir, 'pwa-192x192.png')),
  png(icon, 512, path.join(publicDir, 'pwa-512x512.png')),
  png(icon, 512, path.join(publicDir, 'pwa-maskable-512x512.png')),
  png(icon, 180, path.join(publicDir, 'apple-touch-icon.png')),
]);
console.log('Generated HavenBlocks v2 adaptive, PWA, and splash artwork.');
