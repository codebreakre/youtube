import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Serve `relPath` from inside `baseDir`. Returns false if the file doesn't exist
 * (or would escape baseDir), so the caller can fall through.
 */
export async function serveFile(req, res, baseDir, relPath, { cacheControl = 'no-cache' } = {}) {
  const full = path.resolve(baseDir, '.' + path.posix.normalize('/' + relPath));
  if (full !== baseDir && !full.startsWith(baseDir + path.sep)) return false;

  let stat;
  try {
    stat = await fs.promises.stat(full);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
    res.end();
    return true;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
    ETag: etag,
  });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(full).pipe(res);
  return true;
}
