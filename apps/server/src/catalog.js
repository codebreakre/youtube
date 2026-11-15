import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, VIDEOS_DIR, THUMBS_DIR } from './config.js';
import { mp4Duration } from './lib/mp4.js';
import { SearchIndex } from './search.js';
import * as db from './db.js';

/**
 * The video catalog = metadata from data/catalog.json for every file that actually
 * exists in media/videos, plus auto-generated entries for any other video file you
 * drop into that folder. The folder is watched and the catalog reloads on changes.
 */

const VIDEO_EXT = new Set(['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.mkv']);
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

let videos = [];
let byId = new Map();
let index = new SearchIndex([]);
const durationCache = new Map(); // path|mtime → seconds

const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'video';

function autoMeta(file) {
  const name = path.parse(file).name;
  const title = name.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: slug(name),
    title: title.replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
    channel: 'Local Uploads',
    description: `Uploaded from ${file}`,
    tags: title.toLowerCase().split(' ').filter((w) => w.length > 2),
    category: 'Uploads',
    baseViews: 0,
  };
}

async function durationOf(full, stat) {
  const key = `${full}|${stat.mtimeMs}`;
  if (!durationCache.has(key)) {
    const ext = path.extname(full).toLowerCase();
    durationCache.set(key, ['.mp4', '.m4v', '.mov'].includes(ext) ? await mp4Duration(full) : null);
  }
  return durationCache.get(key);
}

export async function loadCatalog() {
  const meta = JSON.parse(await fsp.readFile(path.join(DATA_DIR, 'catalog.json'), 'utf8'));
  await fsp.mkdir(VIDEOS_DIR, { recursive: true });
  await fsp.mkdir(THUMBS_DIR, { recursive: true });

  const files = (await fsp.readdir(VIDEOS_DIR)).filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));
  const thumbs = new Set(await fsp.readdir(THUMBS_DIR));
  const known = new Map(meta.map((m) => [m.file.toLowerCase(), m]));
  const usedIds = new Set();

  const list = [];
  for (const file of files) {
    const m = { ...(known.get(file.toLowerCase()) ?? autoMeta(file)) };
    let id = m.id;
    for (let n = 2; usedIds.has(id); n++) id = `${m.id}-${n}`;
    usedIds.add(id);

    const full = path.join(VIDEOS_DIR, file);
    const stat = await fsp.stat(full);
    const base = path.parse(file).name;
    const thumb = m.thumb && thumbs.has(m.thumb) ? m.thumb : IMAGE_EXT.map((e) => base + e).find((t) => thumbs.has(t));

    list.push({
      ...m,
      id,
      file,
      path: full,
      size: stat.size,
      thumb: thumb ?? null,
      duration: await durationOf(full, stat),
      publishedAt: m.publishedAt ?? stat.mtime.toISOString(),
    });
  }

  list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  videos = list;
  byId = new Map(list.map((v) => [v.id, v]));
  index = new SearchIndex(list);
  console.log(`[catalog] ${list.length} video(s) available`);
}

export function watchCatalog() {
  let timer;
  const reload = () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadCatalog().catch((e) => console.error('[catalog] reload failed', e)), 800);
  };
  for (const dir of [VIDEOS_DIR, THUMBS_DIR]) {
    try {
      fs.watch(dir, reload);
    } catch (e) {
      console.warn(`[catalog] cannot watch ${dir}: ${e.message}`);
    }
  }
}

export const all = () => videos;
export const get = (id) => byId.get(id);
export const search = (q) => index.search(q);
export const suggest = (q, opts) => index.suggest(q, opts);
export const categories = () => [...new Set(videos.map((v) => v.category).filter(Boolean))].sort();

export function related(video, limit = 20) {
  const tags = new Set(video.tags || []);
  return videos
    .filter((v) => v.id !== video.id)
    .map((v) => {
      let score = 0;
      if (v.category === video.category) score += 3;
      if (v.channel === video.channel) score += 2;
      for (const t of v.tags || []) if (tags.has(t)) score += 1;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score || (b.v.baseViews || 0) - (a.v.baseViews || 0))
    .slice(0, limit)
    .map((x) => x.v);
}

/** Shape sent to the browser (never exposes file system paths). */
export function toPublic(v) {
  return {
    id: v.id,
    title: v.title,
    channel: v.channel,
    description: v.description || '',
    tags: v.tags || [],
    category: v.category || null,
    publishedAt: v.publishedAt,
    duration: v.duration,
    views: (v.baseViews || 0) + db.viewsOf(v.id),
    thumbnail: v.thumb ? `/media/thumbs/${encodeURIComponent(v.thumb)}` : null,
    stream: `/api/videos/${encodeURIComponent(v.id)}/stream`,
    size: v.size,
  };
}
