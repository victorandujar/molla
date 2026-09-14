// Local verification of the generated Vercel handler; not a deployment server.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from '../.vercel/output/functions/_render.func/dist/server/entry.mjs';
const root = resolve('.vercel/output/static');
const types = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:4382');
      const file = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (file.startsWith(root + '/')) {
        try {
          if ((await stat(file)).isFile()) {
            res.writeHead(200, {
              'Content-Type':
                types[extname(file)] || 'application/octet-stream',
              'Cache-Control': 'public, max-age=3600',
            });
            res.end(await readFile(file));
            return;
          }
        } catch {}
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, {
        method: req.method,
        headers: new Headers(
          Object.entries(req.headers).flatMap(([k, v]) =>
            v === undefined ? [] : [[k, Array.isArray(v) ? v.join(',') : v]],
          ),
        ),
        ...(!['GET', 'HEAD'].includes(req.method)
          ? { body: Buffer.concat(chunks) }
          : {}),
      });
      const response = await handler.fetch(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      console.error(e);
      res.writeHead(500);
      res.end('Preview error');
    }
  })
  .listen(4382, '127.0.0.1', () =>
    console.log('Built preview: http://127.0.0.1:4382'),
  );
