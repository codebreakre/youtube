import http from 'node:http';
import path from 'node:path';
import { PORT, HOST, WEB_DIR, MINI_DIR, THUMBS_DIR } from './config.js';
import { HttpError, sendJson } from './lib/http.js';
import { serveFile } from './lib/static.js';
import { api } from './api.js';
import { loadCatalog, watchCatalog } from './catalog.js';
import { loadDb, flush } from './db.js';

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    throw new HttpError(400, 'Bad URL');
  }

  // ---- JSON API + video stream
  if (pathname.startsWith('/api/')) {
    const match = api.match(req.method, pathname);
    if (!match) throw new HttpError(404, 'Not found');
    if (match.methodNotAllowed) throw new HttpError(405, 'Method not allowed');
    const result = await match.handler({ req, res, url, query: url.searchParams, params: match.params });
    if (!res.headersSent && result !== undefined) sendJson(res, 200, result);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');

  // ---- static assets
  if (pathname.startsWith('/mini/') && (await serveFile(req, res, MINI_DIR, pathname.slice(6)))) return;
  if (pathname.startsWith('/src/') && (await serveFile(req, res, path.join(WEB_DIR, 'src'), pathname.slice(5)))) return;
  if (
    pathname.startsWith('/media/thumbs/') &&
    (await serveFile(req, res, THUMBS_DIR, pathname.slice(14), { cacheControl: 'public, max-age=86400' }))
  ) return;
  if (await serveFile(req, res, path.join(WEB_DIR, 'public'), pathname)) return;

  // ---- SPA fallback: any extension-less path renders the app shell
  if (!path.extname(pathname)) {
    await serveFile(req, res, WEB_DIR, 'index.html');
    return;
  }
  throw new HttpError(404, 'Not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Internal server error' : err.message });
    else res.destroy();
  });
});

await loadDb();
await loadCatalog();
watchCatalog();

server.listen(PORT, HOST, () => {
  console.log(`\n  Vidora running →  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await flush().catch(() => {});
    process.exit(0);
  });
}
