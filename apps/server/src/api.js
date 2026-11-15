import fs from 'node:fs/promises';
import path from 'node:path';
import { THUMBS_DIR } from './config.js';
import { Router } from './lib/router.js';
import { HttpError, readBody, readJson } from './lib/http.js';
import { streamFile } from './lib/stream.js';
import * as catalog from './catalog.js';
import * as db from './db.js';

export const api = new Router();

// Anonymous per-browser identity (a random id the frontend keeps in localStorage).
const UID_RE = /^[\w-]{8,64}$/;
const optionalUid = (req) => {
  const id = req.headers['x-user-id'];
  return id && UID_RE.test(id) ? id : null;
};
const uidOf = (req) => {
  const id = optionalUid(req);
  if (!id) throw new HttpError(401, 'Missing or invalid X-User-Id header');
  return id;
};
const need = (id) => {
  const v = catalog.get(id);
  if (!v) throw new HttpError(404, 'Video not found');
  return v;
};
const listKey = (l) => {
  const k = String(l).toUpperCase();
  if (!db.LISTS[k]) throw new HttpError(404, 'Unknown playlist');
  return k;
};
const videoIdFrom = (body) => {
  if (typeof body.videoId !== 'string') throw new HttpError(400, 'videoId is required');
  need(body.videoId);
  return body.videoId;
};

// ---- videos -------------------------------------------------------------

api.get('/api/health', () => ({ ok: true, videos: catalog.all().length }));

api.get('/api/videos', () => ({
  categories: catalog.categories(),
  videos: catalog.all().map(catalog.toPublic),
}));

api.get('/api/videos/:id', ({ params }) => catalog.toPublic(need(params.id)));

api.get('/api/videos/:id/related', ({ params }) => catalog.related(need(params.id)).map(catalog.toPublic));

// The video is never sent as a download: the browser asks for byte ranges and we answer
// 206 Partial Content chunk by chunk while it plays.
api.get('/api/videos/:id/stream', ({ req, res, params }) =>
  streamFile(req, res, need(params.id).path, { log: process.env.LOG_STREAM !== '0' }),
);

// No ffmpeg needed: the first browser that shows a video without a thumbnail grabs a frame
// with <canvas> and uploads it here. Never overwrites an existing thumbnail.
api.put('/api/videos/:id/thumbnail', async ({ req, params }) => {
  const v = need(params.id);
  if (v.thumb) return { created: false, thumbnail: catalog.toPublic(v).thumbnail };
  if (!/^image\/jpeg\b/.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Expected image/jpeg');
  const buf = await readBody(req, 2 * 1024 * 1024);
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new HttpError(400, 'Not a JPEG image');

  const name = `${path.parse(v.file).name}.jpg`;
  try {
    await fs.writeFile(path.join(THUMBS_DIR, name), buf, { flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
  await catalog.loadCatalog();
  return { created: true, thumbnail: catalog.toPublic(catalog.get(v.id) ?? v).thumbnail };
});

api.post('/api/videos/:id/view', ({ params }) => {
  const v = need(params.id);
  db.addView(v.id);
  return { views: catalog.toPublic(v).views };
});

// ---- search -------------------------------------------------------------

api.get('/api/search', ({ req, query }) => {
  const q = (query.get('q') || '').trim().slice(0, 200);
  const uid = optionalUid(req);
  if (q && uid) db.recordSearch(uid, q);
  return { query: q, results: catalog.search(q).map(catalog.toPublic) };
});

api.get('/api/suggest', ({ req, query }) => {
  const q = (query.get('q') || '').slice(0, 200);
  const uid = optionalUid(req);
  const own = uid ? db.getUser(uid).searches : [];
  return { query: q, suggestions: catalog.suggest(q, { queries: db.queries(), own }) };
});

api.delete('/api/me/searches', ({ req, query }) => {
  db.removeSearch(uidOf(req), query.get('q') || '');
  return { ok: true };
});

// ---- the current user ---------------------------------------------------

api.get('/api/me', ({ req }) => {
  const u = db.getUser(uidOf(req));
  return {
    lists: Object.fromEntries(Object.entries(u.lists).map(([k, items]) => [k, items.map((i) => i.videoId)])),
    progress: Object.fromEntries(
      u.history.filter((h) => h.duration > 0).map((h) => [h.videoId, Math.min(1, h.position / h.duration)]),
    ),
  };
});

api.get('/api/me/history', ({ req }) => {
  const u = db.getUser(uidOf(req));
  return u.history
    .map((h) => ({ ...h, video: catalog.get(h.videoId) }))
    .filter((h) => h.video)
    .map((h) => ({ ...h, video: catalog.toPublic(h.video) }));
});

api.post('/api/me/history', async ({ req }) => {
  const uid = uidOf(req);
  db.touchHistory(uid, videoIdFrom(await readJson(req)));
  return { ok: true };
});

api.put('/api/me/history/:videoId', async ({ req, params }) => {
  const uid = uidOf(req);
  need(params.videoId);
  const { position, duration } = await readJson(req);
  if (!Number.isFinite(position) || !Number.isFinite(duration) || position < 0 || duration <= 0) {
    throw new HttpError(400, 'position and duration must be numbers');
  }
  db.setProgress(uid, params.videoId, Math.min(position, duration), duration);
  return { ok: true };
});

api.delete('/api/me/history/:videoId', ({ req, params }) => {
  db.removeHistory(uidOf(req), params.videoId);
  return { ok: true };
});

api.delete('/api/me/history', ({ req }) => {
  db.clearHistory(uidOf(req));
  return { ok: true };
});

api.get('/api/me/playlists/:list', ({ req, params }) => {
  const key = listKey(params.list);
  const items = db.getUser(uidOf(req)).lists[key];
  return {
    id: key,
    title: db.LISTS[key],
    items: items
      .map((i) => ({ ...i, video: catalog.get(i.videoId) }))
      .filter((i) => i.video)
      .map((i) => ({ ...i, video: catalog.toPublic(i.video) })),
  };
});

api.post('/api/me/playlists/:list', async ({ req, params }) => {
  const uid = uidOf(req);
  const key = listKey(params.list);
  db.listAdd(uid, key, videoIdFrom(await readJson(req)));
  return { ok: true };
});

api.delete('/api/me/playlists/:list/:videoId', ({ req, params }) => {
  db.listRemove(uidOf(req), listKey(params.list), params.videoId);
  return { ok: true };
});
