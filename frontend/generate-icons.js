/**
 * Générateur d'icônes PWA — fpronix
 * Lance depuis le dossier frontend : node generate-icons.js
 *
 * Prérequis : npm install --save-dev sharp
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ICONS_DIR = path.join(__dirname, 'public', 'icons');
const SVG_FILE  = path.join(ICONS_DIR, 'icon.svg');

async function main() {
  if (!fs.existsSync(SVG_FILE)) {
    console.error('❌  public/icons/icon.svg introuvable.');
    process.exit(1);
  }

  const svgBuf = fs.readFileSync(SVG_FILE);
  const sizes  = [
    { name: 'icon-192x192.png',    size: 192 },
    { name: 'icon-512x512.png',    size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  console.log('Génération des icônes PWA...\n');
  for (const { name, size } of sizes) {
    const outPath = path.join(ICONS_DIR, name);
    await sharp(svgBuf)
      .resize(size, size)
      .png({ quality: 95 })
      .toFile(outPath);
    console.log(`  ✓  ${name}  (${size}×${size})`);
  }

  console.log('\n✅  Terminé ! Lance ensuite : npm run build\n');
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  console.error('\n→ Installe sharp : npm install --save-dev sharp');
});
