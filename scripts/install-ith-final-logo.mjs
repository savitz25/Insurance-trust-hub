/**
 * Install ITH final transport logo into standalone Insurance Trust Hub.
 * node scripts/install-ith-final-logo.mjs [source.png]
 */
import sharp from 'sharp';
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = join(ROOT, 'public', 'brand');
const PUBLIC = join(ROOT, 'public');
const SOURCE_DIR = join(BRAND, 'source');
const DEFAULT_SRC = join(
  'C:',
  'Users',
  'Michael.Savitsky',
  'moch up design',
  'ITH final transport logo.png'
);
const SRC = process.argv[2] || DEFAULT_SRC;

function isMatte(r, g, b, a) {
  if (a === 0) return false;
  if (r <= 18 && g <= 18 && b <= 28 && a > 200) return true;
  if (r >= 240 && g >= 240 && b >= 240) return true;
  return false;
}

async function cleanAndTrim(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const px = new Uint8ClampedArray(data);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2],
      a = px[i + 3];
    if (isMatte(r, g, b, a)) {
      px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
      continue;
    }
    if (a === 0 && (r || g || b)) {
      px[i] = px[i + 1] = px[i + 2] = 0;
    }
  }
  const trimmed = await sharp(Buffer.from(px), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 8 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  console.log(`lockup trim: ${meta.width}x${meta.height}`);
  return { buffer: trimmed, width: meta.width, height: meta.height };
}

async function writeSized(buffer, outPath, width) {
  await sharp(buffer)
    .ensureAlpha()
    .resize({
      width,
      fit: 'inside',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
  const m = await sharp(outPath).metadata();
  console.log(`  ${outPath.replace(ROOT, '')} ${m.width}x${m.height}`);
}

async function extractMark(lockupBuffer, lockupW, lockupH) {
  const side = Math.min(lockupH, Math.round(lockupW * 0.34));
  const mark = await sharp(lockupBuffer)
    .extract({ left: 0, top: 0, width: Math.min(side, lockupW), height: lockupH })
    .trim({ threshold: 8 })
    .png()
    .toBuffer();
  const m = await sharp(mark).metadata();
  const size = Math.max(m.width, m.height);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: mark,
        left: Math.floor((size - m.width) / 2),
        top: Math.floor((size - m.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function resizeSquare(markBuffer, size, padRatio = 0.08) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const resized = await sharp(markBuffer)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function writeIco(png16, png32, png48, outPath) {
  const images = [
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
    { size: 48, buf: png48 },
  ];
  const count = images.length;
  let offset = 6 + count * 16;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const payloads = [];
  for (let i = 0; i < count; i++) {
    const img = images[i];
    payloads.push(img.buf);
    const o = 6 + i * 16;
    header[o] = img.size >= 256 ? 0 : img.size;
    header[o + 1] = img.size >= 256 ? 0 : img.size;
    header[o + 2] = 0;
    header[o + 3] = 0;
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(img.buf.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += img.buf.length;
  }
  writeFileSync(outPath, Buffer.concat([header, ...payloads]));
  console.log(`  ${outPath.replace(ROOT, '')} ico`);
}

async function main() {
  if (!existsSync(SRC)) {
    console.error('Source missing:', SRC);
    process.exit(1);
  }
  // sharp from monorepo if standalone lacks it
  mkdirSync(SOURCE_DIR, { recursive: true });
  copyFileSync(SRC, join(SOURCE_DIR, 'ITH-final-transport-logo.png'));
  console.log('Archived source');

  const { buffer: lockup, width: lw, height: lh } = await cleanAndTrim(SRC);

  // Brand lockups
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo.png'), 960);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo@2x.png'), 1440);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-header.png'), 720);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-header@2x.png'), 1200);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-footer.png'), 560);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-stacked.png'), 720);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-stacked@2x.png'), 1200);
  await writeSized(lockup, join(BRAND, 'insurance-trust-hub-logo-stacked-sm.png'), 400);
  // Alias used in some paths
  copyFileSync(
    join(BRAND, 'insurance-trust-hub-logo-header.png'),
    join(BRAND, 'InsuranceTrustHub-logo-transparent.png')
  );

  const mark = await extractMark(lockup, lw, lh);
  await writeSized(mark, join(BRAND, 'insurance-trust-hub-icon-mark.png'), 512);

  const brandIcons = [
    [16, 'insurance-trust-hub-favicon-16.png'],
    [32, 'insurance-trust-hub-favicon-32.png'],
    [48, 'insurance-trust-hub-favicon-48.png'],
    [192, 'insurance-trust-hub-icon-192.png'],
    [512, 'insurance-trust-hub-icon.png'],
  ];
  const ico = {};
  for (const [size, name] of brandIcons) {
    const buf = await resizeSquare(mark, size, size <= 48 ? 0.06 : 0.1);
    await sharp(buf).png({ compressionLevel: 9 }).toFile(join(BRAND, name));
    console.log(`  /brand/${name} ${size}`);
    if (size === 16 || size === 32 || size === 48) ico[size] = buf;
  }

  // Public root favicons + PWA
  const rootMap = [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [48, 'favicon-48x48.png'],
    [180, 'apple-touch-icon.png'],
    [192, 'android-chrome-192x192.png'],
    [192, 'icon-192.png'],
    [512, 'android-chrome-512x512.png'],
    [512, 'icon-512.png'],
    [32, 'favicon.png'],
  ];
  for (const [size, name] of rootMap) {
    const buf = await resizeSquare(mark, size, size <= 48 ? 0.06 : 0.1);
    await sharp(buf).png({ compressionLevel: 9 }).toFile(join(PUBLIC, name));
    console.log(`  /${name}`);
  }
  writeIco(ico[16], ico[32], ico[48], join(PUBLIC, 'favicon.ico'));
  writeIco(ico[16], ico[32], ico[48], join(BRAND, 'favicon.ico'));

  // OG on Shield navy
  const logoOg = await sharp(lockup)
    .resize({ width: 900, fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const lm = await sharp(logoOg).metadata();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 37, b: 64, alpha: 1 },
    },
  })
    .composite([
      {
        input: logoOg,
        left: Math.floor((1200 - lm.width) / 2),
        top: Math.floor((630 - lm.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(BRAND, 'insurance-trust-hub-og.png'));
  console.log('  /brand/insurance-trust-hub-og.png');

  console.log('\nDone. Bump BRAND_ASSET_VERSION in lib/brand.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
