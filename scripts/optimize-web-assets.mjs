import sharp from 'sharp';

const assets = [
  ['assets/welcome/welcome-background-desktop.png', 'assets/welcome/welcome-background-desktop.webp', 82],
  ['assets/welcome/welcome-background-mobile.png', 'assets/welcome/welcome-background-mobile.webp', 82],
  ['assets/home/machiya-night-hero.png', 'assets/home/machiya-night-hero.webp', 84],
];

for (const [source, target, quality] of assets) {
  await sharp(source).webp({ quality, effort: 6 }).toFile(target);
}
console.log(`Optimized ${assets.length} large display assets as WebP.`);
