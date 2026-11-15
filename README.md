# Vidora

A YouTube-style video platform built with **zero dependencies**: a home-made web-component
framework on the frontend and plain Node.js `http` on the backend, in one monorepo.

```
npm run seed     # download free sample videos (~130 MB) into apps/server/media/videos
npm start        # http://127.0.0.1:3000   (npm run dev = auto-restart on server changes)
npm test         # unit tests (node:test)
```

Requires Node 20+. No `npm install` needed. You can also drop any `.mp4` into
`apps/server/media/videos`; it shows up automatically.

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

## How streaming works

The `<video>` element points at `GET /api/videos/:id/stream`. The browser sends
`Range: bytes=N-` and the server answers **`206 Partial Content`** with at most a **2 MB chunk**
(`apps/server/src/lib/stream.js`). As playback continues, or when you seek, the browser asks for
the next range. Only what is needed is transferred, and the buffered bar in the player shows it.
The response is `Content-Disposition: inline` and the custom player has no download control.

> Why not UDP? Browsers can't open raw UDP sockets. Real platforms stream over HTTP in chunks the
> same way (DASH/HLS segments). The UDP part happens underneath: HTTP/3 runs on QUIC, which is UDP.

## Layout

```
packages/mini/          the framework (~400 lines)
  component.js          Component base class: shadow DOM, adopted styles, state, props, lifecycle,
                        event delegation, batched re-render
  html.js               html`` tagged templates: escaping, @event=, .prop=, ?bool= bindings
  morph.js              DOM morphing (keeps <video>, focused inputs and child components alive)
  store.js / router.js  observable store, History-API router with link interception
apps/server/            Node http server
  src/api.js            REST API          src/catalog.js  video catalog + folder watcher
  src/search.js         search + suggest  src/lib/trie.js  prefix tree
  src/lib/stream.js     range streaming   src/lib/mp4.js   reads duration from MP4 boxes
  data/catalog.json     video metadata    data/db.json     users' history / lists (generated)
apps/web/               SPA, no build step (native ES modules + import map)
  src/api/              every backend call, one file per resource:
                        videos, search, user, history, playlists (+ client.js fetch wrapper)
  src/components/       app-root, top-bar, search-box, side-nav, video-card, video-player, toast-host
  src/pages/            home, results, watch, history, playlist (Watch later / Liked), not-found
```

Users are anonymous: each browser gets a random id (localStorage) sent as `X-User-Id`.
