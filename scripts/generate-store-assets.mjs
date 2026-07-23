import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.join(projectRoot, "store", "screenshots", "raw");
const appStoreDir = path.join(projectRoot, "store", "app-store", "iphone-6.9");
const playPhoneDir = path.join(projectRoot, "store", "google-play", "phone");
const playDir = path.join(projectRoot, "store", "google-play");

const files = [
  "01-main.png",
  "02-discover.png",
  "03-results.png",
  "04-detail.png",
  "05-catalog.png",
  "06-myos.png",
];

await Promise.all([
  fs.mkdir(appStoreDir, { recursive: true }),
  fs.mkdir(playPhoneDir, { recursive: true }),
]);

for (const file of files) {
  const source = path.join(rawDir, file);

  await sharp(source)
    .resize(1290, 2796, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(appStoreDir, file));

  await sharp(source)
    .resize(997, 2160, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .extend({
      left: 41,
      right: 42,
      top: 0,
      bottom: 0,
      background: "#151714",
    })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(playPhoneDir, file));
}

await sharp(path.join(projectRoot, "assets", "brand", "icon.png"))
  .resize(512, 512, { fit: "cover" })
  .ensureAlpha(1)
  .png({ compressionLevel: 9 })
  .toFile(path.join(playDir, "app-icon-512.png"));

const featureGraphic = `
  <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#11130F"/>
        <stop offset="1" stop-color="#25241C"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="38%" r="60%">
        <stop offset="0" stop-color="#B8954F" stop-opacity=".25"/>
        <stop offset="1" stop-color="#B8954F" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <rect width="1024" height="500" fill="url(#glow)"/>
    <circle cx="872" cy="98" r="214" fill="none" stroke="#C2A365" stroke-opacity=".22" stroke-width="1"/>
    <circle cx="872" cy="98" r="132" fill="none" stroke="#C2A365" stroke-opacity=".13" stroke-width="1"/>
    <path d="M744 0L623 500" stroke="#C2A365" stroke-opacity=".15"/>
    <rect x="72" y="76" width="76" height="76" rx="19" fill="#0D0F0C" stroke="#B8954F" stroke-opacity=".55"/>
    <text x="110" y="128" fill="#D9BC7A" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="42" text-anchor="middle">禄</text>
    <text x="72" y="225" fill="#F6F0E3" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="58" font-weight="600">人生の判断と</text>
    <text x="72" y="302" fill="#F6F0E3" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="58" font-weight="600">立ち回りにOSを。</text>
    <line x1="74" y1="354" x2="218" y2="354" stroke="#B8954F" stroke-width="2"/>
    <text x="72" y="405" fill="#C9C2B4" font-family="'Yu Gothic','Hiragino Sans',sans-serif" font-size="24">434の処世術と526の理論を、一冊に。</text>
    <text x="843" y="400" fill="#D9BC7A" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="38" text-anchor="middle">処世術禄</text>
  </svg>
`;

await sharp(Buffer.from(featureGraphic))
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(path.join(playDir, "feature-graphic-1024x500.png"));

console.log(`Generated ${files.length * 2 + 2} store assets.`);
