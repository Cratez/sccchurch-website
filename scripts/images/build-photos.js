// Builds the website photos from the two Pexels originals (which are NOT kept in the repo).
// Usage: npm run photos -- <folder holding the originals>
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.resolve(__dirname, '..', '..', 'assets', 'img', 'photos');
const WIDTHS = [960, 1600, 2400];
const WEBP_QUALITY = 72;
const JPEG_QUALITY = 78;
const MAX_BYTES = 450 * 1024;

// Trillium is a tall photo (4000x6000). We cut a full-width 16:9 band (4000x2250) so it fits a
// wide hero. Centre at 47% of the height keeps the snowy peak and its reflection together.
// Final crop box (tuned by eye): left 0, top 1695, width 4000, height 2250.
const TRILLIUM_CENTER = 0.47;

function trilliumCrop(meta) {
  const height = Math.round((meta.width * 9) / 16);
  const top = Math.min(meta.height - height, Math.max(0, Math.round(meta.height * TRILLIUM_CENTER - height / 2)));
  return { left: 0, top, width: meta.width, height };
}

const PHOTOS = [
  { name: 'hood-sunset', source: 'pexels-aleksey-kuprikov-1883853-3493805.jpg' },
  { name: 'trillium', source: 'pexels-aleksey-kuprikov-1883853-3551192.jpg', crop: trilliumCrop },
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
  console.error('Usage: npm run photos -- <folder holding the two Pexels originals>');
  process.exit(1);
}
build(path.resolve(sourceDir)).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
