/**
 * Script untuk generate semua ukuran icon PWA dari logo_primary.png
 * Jalankan: node generate-icons.js
 * Requires: sharp (sudah ada di package.json)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, 'public', 'logo_primary.png');
const OUTPUT_DIR = path.join(__dirname, 'public', 'icons');

// Buat folder icons jika belum ada
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🔄 Generating PWA icons...\n');

  for (const size of SIZES) {
    // Regular icon (any)
    const outFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(INPUT)
      .resize(size, size, { fit: 'contain', background: { r: 30, g: 58, b: 110, alpha: 1 } })
      .png()
      .toFile(outFile);
    console.log(`✅ icon-${size}x${size}.png`);
  }

  // Maskable icons (with padding ~10% for safe area)
  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;
    const outFile = path.join(OUTPUT_DIR, `icon-maskable-${size}x${size}.png`);
    await sharp(INPUT)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 30, g: 58, b: 110, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 30, g: 58, b: 110, alpha: 1 },
      })
      .png()
      .toFile(outFile);
    console.log(`✅ icon-maskable-${size}x${size}.png`);
  }

  console.log('\n✨ Semua icon berhasil dibuat di public/icons/');
}

generateIcons().catch(console.error);
