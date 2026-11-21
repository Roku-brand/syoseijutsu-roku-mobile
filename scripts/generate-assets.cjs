const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'assets', 'brand');
// Approved brand artwork provided by the owner; retain the original lettering.
const master = path.join(brand, 'app-store-icon.png');
const svgImage = (png, inset = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image x="${inset}" y="${inset}" width="${1024 - inset * 2}" height="${1024 - inset * 2}" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
async function main() {
  const png = await fs.readFile(master);
  for (const [file, size] of [
    ['assets/brand/icon.png', 1024], ['assets/brand/splash-icon.png', 512],
    ['assets/brand/favicon.png', 64], ['assets/upgrade/complete-mark.png', 256],
    ['public/pwa-icon-192.png', 192], ['public/pwa-icon-512.png', 512],
    ['assets/images/icon.png', 1024], ['assets/images/favicon.png', 64], ['assets/images/splash-icon.png', 512],
  ]) await sharp(png).resize(size, size).removeAlpha().png({ compressionLevel: 9 }).toFile(path.join(root, file));
  await fs.writeFile(path.join(brand, 'app-icon.svg'), svgImage(await sharp(png).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()));
  await fs.writeFile(path.join(root, 'public/pwa-icon.svg'), svgImage(await sharp(png).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()));
  // Android applies the outer mask. Keep the artwork inside its foreground safe area.
  const adaptive = svgImage(png, 160);
  await fs.writeFile(path.join(brand, 'adaptive-foreground.svg'), adaptive);
  for (const file of ['assets/brand/adaptive-foreground.png', 'assets/images/android-icon-foreground.png']) await sharp(Buffer.from(adaptive)).png().toFile(path.join(root, file));
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#FFF2D5' } }).png().toFile(path.join(root, 'assets/images/android-icon-background.png'));
  // Themed Android icons use the actual central glyph as their alpha mask.
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const glyph = x > 128 && x < 884 && y > 280 && y < 548 && data[i] < 150 && data[i + 1] < 115 && data[i + 2] < 90;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = glyph ? 255 : 0;
  }
  const mono = await sharp(data, { raw: info }).resize(704, 704).extend({ top: 160, bottom: 160, left: 160, right: 160, background: '#00000000' }).png().toBuffer();
  await fs.writeFile(path.join(brand, 'monochrome.svg'), svgImage(mono));
  for (const file of ['assets/brand/monochrome.png', 'assets/images/android-icon-monochrome.png']) await fs.writeFile(path.join(root, file), mono);
  console.log('Generated brand assets for native, Web and PWA.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
