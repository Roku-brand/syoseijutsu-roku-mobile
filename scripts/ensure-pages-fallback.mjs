import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const indexPath = resolve(dist, 'index.html');
const fallbackPath = resolve(dist, '404.html');

await access(indexPath, constants.F_OK);
const index = await readFile(indexPath, 'utf8');
const fallbackRedirect = `<script>
  (() => {
    const path = window.location.pathname;
    const shortTechniqueId = path.match(/^\\/card\\/master336-(\\d{1,2})\\/?$/);

    if (shortTechniqueId) {
      const number = Number(shortTechniqueId[1]);
      if (number >= 1 && number <= 336) {
        const canonicalPath = \`/card/master336-\${String(number).padStart(3, '0')}\`;
        window.location.replace(\`\${canonicalPath}\${window.location.search}\${window.location.hash}\`);
        return;
      }
    }

    if (/^\\/card\\/master336-\\d+\\/?$/.test(path)) {
      window.location.replace('/+not-found');
    }
  })();
</script>`;

await writeFile(fallbackPath, index.replace('</head>', `${fallbackRedirect}</head>`));
console.log('GitHub Pages SPA fallback written to dist/404.html');
