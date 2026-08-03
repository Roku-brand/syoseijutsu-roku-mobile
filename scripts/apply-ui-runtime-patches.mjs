import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, transforms) {
  let source = await readFile(path, 'utf8');
  const original = source;

  for (const [before, after] of transforms) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Patch target not found in ${path}: ${before.slice(0, 80)}`);
    }
    source = source.replace(before, after);
  }

  if (source !== original) await writeFile(path, source);
}

await patch('src/app/(tabs)/index.tsx', [
  [
    '  const minimumSize = compact ? 14 : 22;',
    '  const minimumSize = compact ? 10 : 18;',
  ],
  [
    '                  minimumFontScale={0.82}',
    '                  minimumFontScale={0.5}',
  ],
]);

await patch('src/app/card/[id].tsx', [
  [
    '  const tags = Array.from(\n    new Set([card.categoryName, card.subcategory, ...(card.tags ?? [])]),\n  );',
    `  const tags = Array.from(\n    new Set([card.categoryName, card.subcategory, ...(card.tags ?? [])]),\n  );\n  const titleLength = [...card.title.replace(/\\s/g, '')].length;\n  const titleFontSize =\n    titleLength <= 18 ? 34 : titleLength <= 24 ? 28 : titleLength <= 32 ? 22 : 16;`,
  ],
  [
    '          minimumFontScale={0.7}\n          style={styles.title}',
    '          minimumFontScale={0.5}\n          style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.46) }]}',
  ],
]);
