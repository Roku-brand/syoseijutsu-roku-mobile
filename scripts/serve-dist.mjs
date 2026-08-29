import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const base = '';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  let relative = decodeURIComponent(url.pathname);
  if (relative.startsWith(base)) relative = relative.slice(base.length);
  if (relative === '' || relative === '/') relative = '/index.html';
  let filePath = path.resolve(root, `.${relative}`);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    response.writeHead(403).end();
    return;
  }
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    const indexPath = path.join(filePath, 'index.html');
    const indexInfo = await stat(indexPath).catch(() => null);
    if (info?.isDirectory() && indexInfo?.isFile()) filePath = indexPath;
    else {
      const htmlPath = `${filePath}.html`;
      const htmlInfo = await stat(htmlPath).catch(() => null);
      if (htmlInfo?.isFile()) filePath = htmlPath;
      else {
        response.writeHead(404).end('Not found');
        return;
      }
    }
  }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
});

server.listen(4173, '127.0.0.1', () => console.log('Serving dist on http://127.0.0.1:4173'));
