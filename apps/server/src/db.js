import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from './config.js';

/**
 * JSON-file persistence. Everything lives in memory and is flushed to data/db.json
 * shortly after each change.
 */
const FILE = path.join(DATA_DIR, 'db.json');
const MAX_HISTORY = 500;
const MAX_SEARCHES = 50;

export const LISTS = { WL: 'Watch later', LL: 'Liked videos' };

let data = { users: {}, queries: {}, views: {} };
let timer = null;

export async function loadDb() {
  try {
    Object.assign(data, JSON.parse(await fs.readFile(FILE, 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('[db] could not read db.json, starting fresh:', e.message);
  }
}

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => flush().catch((e) => console.error('[db] flush failed', e)), 250);
}

export async function flush() {
  clearTimeout(timer);
  timer = null;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(data);
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, json);
  try {
    await fs.rename(tmp, FILE);
  } catch {
    await fs.writeFile(FILE, json); // Windows can refuse rename over a locked file
    await fs.rm(tmp, { force: true });
  }
}

export function getUser(uid) {
  const u = (data.users[uid] ??= {});
  u.history ??= [];
  u.searches ??= [];
  u.lists ??= {};
  for (const k of Object.keys(LISTS)) u.lists[k] ??= [];
  return u;
}

// ---- watch history ------------------------------------------------------

export function touchHistory(uid, videoId) {
  const u = getUser(uid);
  const prev = u.history.find((h) => h.videoId === videoId);
  u.history = u.history.filter((h) => h.videoId !== videoId);
  u.history.unshift({
    videoId,
    watchedAt: Date.now(),
    position: prev?.position ?? 0,
    duration: prev?.duration ?? 0,
  });
  u.history.splice(MAX_HISTORY);
  persist();
}

export function setProgress(uid, videoId, position, duration) {
  const u = getUser(uid);
  let entry = u.history.find((h) => h.videoId === videoId);
  if (!entry) {
    touchHistory(uid, videoId);
    entry = u.history[0];
  }
  entry.position = position;
  entry.duration = duration;
  persist();
}

export function removeHistory(uid, videoId) {
  const u = getUser(uid);
  u.history = u.history.filter((h) => h.videoId !== videoId);
  persist();
}

export function clearHistory(uid) {
  getUser(uid).history = [];
  persist();
}

// ---- playlists (Watch later / Liked) ------------------------------------

export function listAdd(uid, list, videoId) {
  const items = getUser(uid).lists[list];
  if (items.some((i) => i.videoId === videoId)) return;
  const item = { videoId, addedAt: Date.now() };
  if (list === 'WL') items.push(item); // watch later is a queue: oldest first
  else items.unshift(item);
  persist();
}

export function listRemove(uid, list, videoId) {
  const u = getUser(uid);
  u.lists[list] = u.lists[list].filter((i) => i.videoId !== videoId);
  persist();
}

// ---- searches & views ---------------------------------------------------

export function recordSearch(uid, q) {
  const u = getUser(uid);
  u.searches = [q, ...u.searches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_SEARCHES);
  const key = q.toLowerCase();
  data.queries[key] = (data.queries[key] || 0) + 1;
  persist();
}

export function removeSearch(uid, q) {
  const u = getUser(uid);
  u.searches = u.searches.filter((s) => s.toLowerCase() !== q.toLowerCase());
  persist();
}

export const queries = () => data.queries;

export function addView(videoId) {
  data.views[videoId] = (data.views[videoId] || 0) + 1;
  persist();
}

export const viewsOf = (videoId) => data.views[videoId] || 0;
