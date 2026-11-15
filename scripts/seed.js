#!/usr/bin/env node
/**
 * Downloads the freely-licensed sample videos listed in apps/server/data/catalog.json
 * (each entry's `url`) into apps/server/media/videos.
 *
 *   npm run seed          # everything except entries marked "large" (~180 MB)
 *   npm run seed:all      # include the large ones too
 *
 * Thumbnails are generated automatically by the browser the first time a video is shown.
 * You can also just drop your own .mp4 files into apps/server/media/videos.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join(ROOT, 'apps', 'server');
const VIDEOS = path.join(SERVER, 'media', 'videos');
const THUMBS = path.join(SERVER, 'media', 'thumbs');

const includeLarge = process.argv.includes('--all');
const catalog = JSON.parse(await fsp.readFile(path.join(SERVER, 'data', 'catalog.json'), 'utf8'));

await fsp.mkdir(VIDEOS, { recursive: true });
await fsp.mkdir(THUMBS, { recursive: true });

async function download(url, dest) {
  try {
    if ((await fsp.stat(dest)).size > 0) {
      console.log(`  ✓ ${path.basename(dest)} (already there)`);
      return;
    }
  } catch {}

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  let done = 0;
  let lastPrint = 0;
  const name = path.basename(dest);
  const progress = new Transform({
    transform(chunk, _enc, cb) {
      done += chunk.length;
      const now = Date.now();
      if (process.stdout.isTTY && now - lastPrint > 200) {
        lastPrint = now;
        const pct = total ? ` ${((done / total) * 100).toFixed(0)}%` : '';
        process.stdout.write(`\r  ↓ ${name} ${(done / 1048576).toFixed(1)} MB${pct}   `);
      }
      cb(null, chunk);
    },
  });

  const tmp = `${dest}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body), progress, fs.createWriteStream(tmp));
  } catch (e) {
    await fsp.rm(tmp, { force: true });
    throw e;
  }
  await fsp.rename(tmp, dest);
  if (process.stdout.isTTY) process.stdout.write('\r');
  console.log(`  ✓ ${name} ${(done / 1048576).toFixed(1)} MB              `);
}

let failed = 0;
for (const v of catalog) {
  if (v.large && !includeLarge) {
    console.log(`  – skipping ${v.file} (large, use --all)`);
    continue;
  }
  if (!v.url) continue;
  try {
    if (v.thumb && v.thumbUrl) await download(v.thumbUrl, path.join(THUMBS, v.thumb));
    await download(v.url, path.join(VIDEOS, v.file));
  } catch (e) {
    failed++;
    console.error(`  ✗ ${v.file}: ${e.message}`);
  }
}

console.log(failed ? `\nDone with ${failed} failure(s).` : '\nDone. Start the app with: npm start');
process.exitCode = failed ? 1 : 0;
