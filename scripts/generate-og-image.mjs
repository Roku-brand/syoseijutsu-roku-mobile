import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const logo = (await readFile('assets/brand/icon.png')).toString('base64');
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171916"/>
      <stop offset="1" stop-color="#0d0f0d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#paper)"/>
  <rect x="28" y="28" width="1144" height="574" rx="18" fill="none" stroke="#92713b" stroke-width="2"/>
  <rect x="48" y="48" width="1104" height="534" rx="12" fill="none" stroke="#4e4027" stroke-width="1"/>
  <image href="data:image/png;base64,${logo}" x="86" y="151" width="328" height="328"/>
  <line x1="468" y1="151" x2="468" y2="479" stroke="#92713b" stroke-width="2"/>
  <text x="530" y="214" fill="#d2b06f" font-family="Yu Mincho, Noto Serif CJK JP, serif" font-size="30" letter-spacing="12">処世術禄</text>
  <text x="530" y="305" fill="#fff8e9" font-family="Yu Mincho, Noto Serif CJK JP, serif" font-size="46" font-weight="700">人生をうまく生きる方法を、</text>
  <text x="530" y="378" fill="#fff8e9" font-family="Yu Mincho, Noto Serif CJK JP, serif" font-size="46" font-weight="700">すべての人へ。</text>
  <text x="533" y="447" fill="#c3b9a8" font-family="Yu Gothic, Noto Sans CJK JP, sans-serif" font-size="20" letter-spacing="2">人物像 → 処世術 → 理論 → 実践</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og.png');
console.log('Generated public/og.png (1200x630).');
