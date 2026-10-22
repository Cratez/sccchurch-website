// Builds the website photos from the Pexels originals (which are NOT kept in the repo).
// Usage: npm run photos -- <folder holding the originals>
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.resolve(__dirname, '..', '..', 'assets', 'img', 'photos');
const WIDTHS = [960, 1600, 2400];
const WEBP_QUALITY = 72;
const JPEG_QUALITY = 78;
const MAX_BYTES = 450 * 1024;

// Most originals are already wide (about 3:2) and are not cropped; each page positions its photo
// with CSS object-position. The kayak photo is tall (4000x6000), so we cut a full-width 16:9 band
// from it; centring the band at 40% of the height leaves sky above the summit and keeps the kayaker.
const KAYAK_CENTER = 0.40;

function wideBand(center) {
  return (meta) => {
    const height = Math.round((meta.width * 9) / 16);
    const top = Math.min(meta.height - height, Math.max(0, Math.round(meta.height * center - height / 2)));
    return { left: 0, top, width: meta.width, height };
  };
}

const PHOTOS = [
  { name: 'hood-sunset', source: 'pexels-aleksey-kuprikov-1883853-3493805.jpg' }, // Home
  { name: 'trillium', source: 'pexels-aleksey-kuprikov-1883853-3551197.jpg' }, // Plan your visit
  { name: 'hood-summit', source: 'pexels-aleksey-kuprikov-1883853-3551214.jpg' }, // What We Believe
  { name: 'trillium-kayak', source: 'pexels-aleksey-kuprikov-1883853-3551192.jpg', crop: wideBand(KAYAK_CENTER) }, // Sermons
];

async function build(sourceDir) {
  const missing = PHOTOS.map((p) => path.join(sourceDir, p.source)).filter((f) => !fs.existsSync(f));
  if (missing.length) {
    throw new Error(`Original photo(s) not found:\n  ${missing.join('\n  ')}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let largest = 0;
  for (const photo of PHOTOS) {
    const file = path.join(sourceDir, photo.source);
    const meta = await sharp(file).metadata();
    // rotate() applies the EXIF orientation before we measure or crop.
    let base = sharp(file).rotate();
    if (photo.crop) {
      const box = photo.crop(meta);
      console.log(`${photo.name}: crop ${JSON.stringify(box)}`);
      base = base.extract(box);
    }
    const cropped = await base.toBuffer();
    // sharp drops metadata by default; we never call withMetadata().
    for (const width of WIDTHS) {
      const resized = sharp(cropped).resize({ width, withoutEnlargement: true });
      await write(resized.clone().webp({ quality: WEBP_QUALITY }), `${photo.name}-${width}.webp`);
    }
    await write(sharp(cropped).resize({ width: 1600 }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }), `${photo.name}-1600.jpg`);
  }

  async function write(pipeline, name) {
    const info = await pipeline.toFile(path.join(OUT_DIR, name));
    largest = Math.max(largest, info.size);
    console.log(`${name}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
  }

  if (largest > MAX_BYTES) {
    console.warn(`Warning: largest file is ${(largest / 1024).toFixed(0)} KB (target under 450 KB).`);
  }
}

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('Usage: npm run photos -- <folder holding the Pexels originals>');
  process.exit(1);
}
build(path.resolve(sourceDir)).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
