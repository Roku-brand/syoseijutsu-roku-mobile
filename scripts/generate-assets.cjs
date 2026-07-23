const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'assets', 'brand');

async function render(input, output, size, options = {}) {
  const pipeline = sharp(path.join(brand, input)).resize(size, size);
  if (options.flatten) pipeline.flatten({ background: options.flatten });
  await pipeline.png({ compressionLevel: 9 }).toFile(path.join(brand, output));
}

async function main() {
  if (!fs.existsSync(brand)) fs.mkdirSync(brand, { recursive: true });
  await Promise.all([
    render('app-icon.svg', 'icon.png', 1024, { flatten: '#151714' }),
    render('app-icon.svg', 'splash-icon.png', 512),
    render('app-icon.svg', 'favicon.png', 64, { flatten: '#151714' }),
    render('adaptive-foreground.svg', 'adaptive-foreground.png', 1024),
    render('monochrome.svg', 'monochrome.png', 1024),
  ]);
  console.log('Generated production brand assets.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
