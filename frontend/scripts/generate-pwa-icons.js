/**
 * Génère les icônes PWA (PNG) depuis l'icône SVG source.
 * Usage : node scripts/generate-pwa-icons.js
 * Prérequis : npm install -g sharp-cli   OU   npm install sharp --save-dev
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SRC  = path.join(__dirname, '../public/icons/icon.svg');
const DEST = path.join(__dirname, '../public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

  for (const size of SIZES) {
    const outFile = path.join(DEST, `icon-${size}x${size}.png`);
    await sharp(SRC)
      .resize(size, size)
      .png()
      .toFile(outFile);
    console.log(`✅ ${outFile}`);
  }

  console.log('\n🎉 Icônes PWA générées avec succès !');
  console.log('Elles se trouvent dans : public/icons/');
}

generate().catch((err) => {
  console.error('Erreur :', err.message);
  console.log('\n💡 Astuce : installez sharp avec  npm install sharp --save-dev');
  process.exit(1);
});
