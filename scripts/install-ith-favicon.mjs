/**
 * Generate Insurance Trust Hub favicon + PWA icon set from the official
 * transparent lockup mark (bracket + multi-node hub). Fully transparent —
 * no white plate (matches Move Trust Hub tab-icon treatment).
 *
 * Usage: node scripts/install-ith-favicon.mjs [optionalSourcePng]
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = join(ROOT, 'public', 'brand');
const PUBLIC = join(ROOT, 'public');
const DEFAULT = join(BRAND, 'insurance-trust-hub-logo-header.png');
const SOURCE = process.argv[2] || DEFAULT;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function stripBg(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const p = new Uint8ClampedArray(data);
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    const a = p[i + 3];
    if (a < 16 || (r < 40 && g < 40 && b < 45) || (r > 245 && g > 245 && b > 245)) {
      p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0;
    }
  }
  return sharp(Buffer.from(p), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

/** Extract left hub mark (bracket + nodes) from horizontal lockup */
async function extractMark(cleaned) {
  const meta = await sharp(cleaned).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const cut = Math.min(Math.floor(w * 0.34), Math.floor(h * 1.4));
  const slice = await sharp(cleaned)
    .extract({ left: 0, top: 0, width: Math.min(cut, w), height: h })
    .trim({ threshold: 8 })
    .png()
    .toBuffer();
  const m = await sharp(slice).metadata();
  const side = Math.max(m.width || 1, m.height || 1);
  const pad = Math.round(side * 0.1);
  return sharp(slice)
    .extend({
      top: Math.floor((side - (m.height || 0)) / 2) + pad,
      bottom: Math.ceil((side - (m.height || 0)) / 2) + pad,
      left: Math.floor((side - (m.width || 0)) / 2) + pad,
      right: Math.ceil((side - (m.width || 0)) / 2) + pad,
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();
}

async function writeTransparent(mark, rel, size) {
  const out = join(ROOT, rel);
  const inner = Math.max(Math.round(size * 0.88), size >= 32 ? size - 4 : size);
  const resized = await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  console.log('wrote', rel, '(transparent)');
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error('Source not found:', SOURCE);
    process.exit(1);
  }

  mkdirSync(BRAND, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });

  const cleaned = await stripBg(SOURCE);
  const mark = await extractMark(cleaned);
  const markMeta = await sharp(mark).metadata();
  console.log(`Source: ${SOURCE}`);
  console.log(`Mark: ${markMeta.width}x${markMeta.height}`);

  // Brand masters
  await writeTransparent(mark, 'public/brand/insurance-trust-hub-icon.png', 512);
  await writeTransparent(mark, 'public/brand/insurance-trust-hub-icon-192.png', 192);
  await writeTransparent(mark, 'public/brand/insurance-trust-hub-favicon-32.png', 32);
  await writeTransparent(mark, 'public/brand/insurance-trust-hub-favicon-16.png', 16);

  // Public root set
  await writeTransparent(mark, 'public/icon-512.png', 512);
  await writeTransparent(mark, 'public/icon-192.png', 192);
  await writeTransparent(mark, 'public/android-chrome-512x512.png', 512);
  await writeTransparent(mark, 'public/android-chrome-192x192.png', 192);
  await writeTransparent(mark, 'public/favicon-16x16.png', 16);
  await writeTransparent(mark, 'public/favicon-32x32.png', 32);
  await writeTransparent(mark, 'public/favicon-48x48.png', 48);
  await writeTransparent(mark, 'public/favicon.png', 32);
  await writeTransparent(mark, 'public/apple-touch-icon.png', 180);

  const ico32 = await sharp({
    create: { width: 32, height: 32, channels: 4, background: TRANSPARENT },
  })
    .composite([
      {
        input: await sharp(mark)
          .resize(28, 28, { fit: 'contain', background: TRANSPARENT })
          .png()
          .toBuffer(),
        gravity: 'centre',
      },
    ])
    .png()
    .toBuffer();
  writeFileSync(join(PUBLIC, 'favicon.ico'), ico32);
  writeFileSync(join(ROOT, 'app', 'favicon.ico'), ico32);
  console.log('wrote public/favicon.ico + app/favicon.ico (transparent)');

  writeFileSync(
    join(PUBLIC, 'site.webmanifest'),
    JSON.stringify(
      {
        id: '/',
        name: 'Insurance Trust Hub',
        short_name: 'Insurance HQ',
        description:
          'Independent DOI-verified insurance research, tools, and agent directory. No paid placements. No lead selling.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F8FAFC',
        theme_color: '#0284C7',
        lang: 'en-US',
        dir: 'ltr',
        categories: ['finance', 'lifestyle', 'utilities'],
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Research Center',
            short_name: 'Tools',
            url: '/tools?source=pwa',
          },
          {
            name: 'Agent directory',
            short_name: 'Directory',
            url: '/directory?source=pwa',
          },
          {
            name: 'Provider lookup',
            short_name: 'Doctors',
            url: '/tools/medicare-provider-lookup?source=pwa',
          },
        ],
      },
      null,
      2
    ) + '\n'
  );
  console.log('wrote public/site.webmanifest (theme #0284C7)');
  console.log('Done — all icons transparent (no white plate).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
