import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { STREAM_CHUNK } from '../config.js';

const VIDEO_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
};

/**
 * Parse a single-range "Range: bytes=…" header.
 * Returns {start, end} (inclusive), 'invalid' for an unsatisfiable range, or null to send the whole file.
 * Open-ended ranges ("bytes=1000-") are capped at `chunk` bytes so the player pulls the video
 * piece by piece as it plays instead of downloading it in one go.
 */
export function parseRange(header, size, chunk = STREAM_CHUNK) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m) return null; // multi-range or garbage → ignore, send whole file
  const [, a, b] = m;
  if (a === '' && b === '') return 'invalid';

  let start;
  let end;
  if (a === '') {
    // suffix range: last N bytes
    start = Math.max(0, size - Number(b));
    end = size - 1;
  } else {
    start = Number(a);
    end = b === '' ? Math.min(start + chunk - 1, size - 1) : Math.min(Number(b), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}

/** Stream a video file with HTTP Range support (206 Partial Content). */
export async function streamFile(req, res, filePath, { log = false } = {}) {
  const { size } = await fs.promises.stat(filePath);
  const headers = {
    'Content-Type': VIDEO_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };

  const range = parseRange(req.headers.range, size);
  if (range === 'invalid') {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }

  let stream;
  if (range) {
    const { start, end } = range;
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    if (log) {
      const mb = (n) => (n / 1048576).toFixed(1);
      console.log(`[stream] ${path.basename(filePath)}  ${mb(start)}–${mb(end + 1)} MB of ${mb(size)} MB`);
    }
    stream = req.method === 'HEAD' ? null : fs.createReadStream(filePath, { start, end });
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': size });
    stream = req.method === 'HEAD' ? null : fs.createReadStream(filePath);
  }

  if (!stream) {
    res.end();
    return;
  }
  // Browsers abort range requests all the time when seeking — that's not an error.
  pipeline(stream, res, () => {});
}
