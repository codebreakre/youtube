# Vidora

A YouTube-style video platform built with **zero dependencies**: a home-made web-component
framework on the frontend and plain Node.js `http` on the backend, in one monorepo.

## Requirements

- Node.js **20 or newer**. That's all: no `npm install`, no build step, no database, no ffmpeg.

## Getting started

```
npm run seed     # download free sample videos (~130 MB) into apps/server/media/videos
npm start        # open http://127.0.0.1:3000
```

| Command | What it does |
|---|---|
| `npm start` | Start the server on http://127.0.0.1:3000 (`PORT` / `HOST` env vars change it) |
| `npm run dev` | Same, but restarts automatically when server files change |
| `npm run seed` | Download the sample videos (skips ones already downloaded) |
| `npm run seed:all` | Also download the large ones (Sintel full movie) |
| `npm run reset` | Clear all user data and thumbnails (see below) |
| `npm test` | Run the unit tests (`node:test`) |

You can also drop any `.mp4` into `apps/server/media/videos`; it shows up in the app automatically.
To give it a proper title, channel and tags, add an entry to `apps/server/data/catalog.json`.

## Installing on another PC

1. Install Node.js 20+.
2. Copy the project folder **without** these generated paths (they are git-ignored):
   - `apps/server/media/`: downloaded videos and thumbnails
   - `apps/server/data/db.json`: history, Watch later, likes, searches, view counts
3. In the project folder run `npm run seed`, then `npm start`.

## Resetting

Stop the server first, otherwise it writes its in-memory data back to disk when it exits.

```
npm run reset            # clear history, Watch later, likes, past searches, views + thumbnails
npm run reset -- --all   # same, and delete downloaded videos too (then run npm run seed)
```

Thumbnails are regenerated automatically the next time the home page loads.

Each browser also remembers its anonymous user id in localStorage (`uid`). To appear as a brand-new
user, clear the site data for `127.0.0.1:3000` in the browser.

## Features

- **Search with autocomplete**: server-side trie over titles, tags, channels and categories,
  plus your own past searches (clock icon, removable) and popular queries. ↑/↓/Enter/Esc work.
- **Streaming, not downloading**: see below.
- **Watch later**: clock button on thumbnail hover, the ⋮ menu, or "Watch later" on the watch page.
  Undo from the toast. Play-all queue with auto-advance.
- **History**: added when playback starts, grouped by day, searchable, removable, clearable.
  Resume position is saved every 5 s, shown as a red bar on thumbnails, and restored on return.
- Liked videos, custom player (seek with buffered ranges, volume, speed, theater, fullscreen,
  keyboard: `k`/space, `j`/`l`, ←/→, ↑/↓, `m`, `f`, `t`, `0`–`9`, `Shift+N`), hover previews,
  autoplay next with countdown, dark/light theme, responsive layout.
- Thumbnails without ffmpeg: the first browser to show a video grabs a frame with `<canvas>`
  and uploads it.

## @vidora/http (axios-style client)

`packages/http` is a small HTTP client written for this project with the same syntax as axios:

```js
import http from '@vidora/http';

const { data, status, headers } = await http.get('/api/search', { params: { q: 'bunny' } });
await http.post('/api/me/history', { videoId: 'big-buck-bunny' });

const api = http.create({ baseURL: '/api', timeout: 15000, headers: { 'X-App': 'vidora' } });
api.interceptors.request.use((config) => { config.headers['X-User-Id'] = uid; return config; });
api.interceptors.response.use((res) => res, (err) => Promise.reject(err));

try { await api.get('/videos/missing'); }
catch (e) { if (http.isHttpError(e)) console.log(e.response.status, e.code); } // 404 ERR_BAD_REQUEST
```

It supports:
- **Calling styles:** `http(config)`, `http(url, config)`, `get`, `delete`, `head`, `options`, `post`, `put`, `patch`, and `postForm` / `putForm` / `patchForm`.
- **Instances:** `create()` and `defaults` (including `headers.common` and per-method headers).
- **Interceptors:** `use`, `eject`, `clear`, and the `runWhen` option.
- **Config options:** `baseURL`, `params`, `paramsSerializer`, `timeout`, `responseType`, `validateStatus`, `auth`, `transformRequest`, `transformResponse` and `fetchOptions`.
- **Cancelling requests:** `signal` with an `AbortController`, or the older `CancelToken.source()`.
- **Errors:** `HttpError` (with `code`, `response` and `status`), `isHttpError` and `isCancel`.
- **Helpers:** `all` and `spread`.

The main difference from axios is the names: `HttpError` / `isHttpError` instead of `AxiosError` / `isAxiosError`. There's also no upload progress, because requests go through `fetch`.

## How streaming works

The `<video>` element points at `GET /api/videos/:id/stream`. The browser sends
`Range: bytes=N-` and the server answers **`206 Partial Content`** with at most a **2 MB chunk**
(`apps/server/src/lib/stream.js`). As playback continues, or when you seek, the browser asks for
the next range. Only what is needed is transferred, and the buffered bar in the player shows it.
The response is `Content-Disposition: inline` and the custom player has no download control.

> Why not UDP? Browsers can't open raw UDP sockets. Real platforms stream over HTTP in chunks the
> same way (DASH/HLS segments). The UDP part happens underneath: HTTP/3 runs on QUIC, which is UDP.

## Project layout

```
packages/mini/          the framework (~400 lines)
  component.js          Component base class: shadow DOM, adopted styles, state, props, lifecycle,
                        event delegation, batched re-render
  html.js               html`` tagged templates: escaping, @event=, .prop=, ?bool= bindings
  morph.js              DOM morphing (keeps <video>, focused inputs and child components alive)
  store.js / router.js  observable store, History-API router with link interception
packages/http/          @vidora/http: our own HTTP client with the same API as axios (built on fetch)
apps/server/            Node http server
  src/api.js            REST API          src/catalog.js  video catalog + folder watcher
  src/search.js         search + suggest  src/lib/trie.js  prefix tree
  src/lib/stream.js     range streaming   src/lib/mp4.js   reads duration from MP4 boxes
  data/catalog.json     video metadata    data/db.json     users' history / lists (generated)
apps/web/               SPA, no build step (native ES modules + import map)
  src/api/              every backend call, one file = one request
    client.js           the configured @vidora/http instance (baseURL, user id, error messages)
    videos/             getVideos, getVideo, getRelatedVideos, addView, uploadThumbnail
    search/             searchVideos, getSuggestions, removeSearch
    user/               getMe
    history/            getHistory, addToHistory, saveProgress, removeFromHistory, clearHistory
    playlists/          getPlaylist, addToPlaylist, removeFromPlaylist
                        (each folder's index.js groups them: videosApi, searchApi, ...)
  src/components/       app-root, top-bar, search-box, side-nav, video-card, video-player, toast-host
  src/pages/            home, results, watch, history, playlist (Watch later / Liked), not-found
scripts/                seed.js (download sample videos), reset.js (clear generated data)
```

Users are anonymous: each browser gets a random id (localStorage) sent as `X-User-Id`.
