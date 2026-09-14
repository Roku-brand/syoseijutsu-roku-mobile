import { access, copyFile } from 'node:fs/promises';

// Keep the Japanese text rasterized in the checked-in source image. Rendering
// the former SVG on Linux depended on system CJK fonts, which caused missing
// glyph boxes in production even though the image looked correct on Windows.
try {
  await access('assets/brand/og-source.png');
  await copyFile('assets/brand/og-source.png', 'public/og.png');
  console.log('Copied public/og.png from the platform-independent source image.');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  await access('public/og.png');
  console.log('Kept the checked-in public/og.png because no separate source image is present.');
}
