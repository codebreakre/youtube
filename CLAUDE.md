# Vidora: project guide for Claude

## What this project is

A YouTube-style video platform in one monorepo, written in plain JavaScript with **zero
dependencies**: no npm packages, no bundler, no build step. The user's requirements were:

- their **own web components and mini framework** (`packages/mini`), not React/Lit/etc.
- **search autocomplete** while typing
- videos must **stream** (HTTP Range / `206 Partial Content`), never download as a whole file
- a **Watch later** list
- a **History** list of watched videos
- backend and frontend in a **single repo**

Keep it dependency-free. Don't add npm packages or a build step unless the user asks.

## Commands

```
npm start        # server on http://127.0.0.1:3000 (PORT, HOST env vars)
npm run dev      # node --watch
npm run seed     # download sample videos listed in apps/server/data/catalog.json
npm run reset    # delete db.json + thumbnails (--all also deletes videos); stop the server first
npm test         # node --test packages/*/test, apps/*/test
```

Requires Node 20+.

## Structure

- `packages/mini/src/`: the framework, served to the browser at `/mini/` via an import map
  (`import { Component, define, html, css } from 'mini'`).
  - `component.js`: shadow-DOM `Component` base class.
    - Statics: `styles`, `props`, `attrs`.
    - Methods: `state`/`setState`, `use(store, selector)`, `subscribe`, `emit` (bubbling + composed).
    - Lifecycle: `onMount`/`onUnmount`.
    - The first render is deferred a microtask so a parent can set props first.
  - `html.js`: `html` tagged templates. Bindings are written unquoted: `@click=${fn}`,
    `.prop=${value}`, `?disabled=${bool}`.
  - `morph.js`: DOM morphing. Use `key="..."` on list items. Elements with `data-static` keep
    their children.
  - `store.js` (`createStore`) and `router.js` (History-API router).
- `packages/http/src/`: `@vidora/http`, our HTTP client with the same API as axios, built on `fetch`.
  - The browser loads it from `/http/` through the import map.
  - Files: `Http.js` (request and interceptor chain), `adapter.js` (the fetch call),
    `defaults.js` (transforms), `headers.js`, `buildURL.js`, `errors.js`.
  - Tests are in `packages/http/test/`. Keep its API the same as axios.
- `apps/server/src/`: Node `http` server.
  - `index.js`: entry point. Serves `/api/`, `/mini/`, `/src/`, thumbnails, and the SPA fallback.
  - `api.js`: all REST routes. `lib/router.js` is a small method + path router.
  - `catalog.js`: loads `data/catalog.json` and watches `media/videos`. Unknown `.mp4` files get
    auto-generated metadata.
  - `search.js` + `lib/trie.js`: search and autocomplete.
  - `db.js`: per-user history, lists (`WL` Watch later, `LL` Liked), progress, searches and views,
    stored in `data/db.json` with debounced writes.
  - `lib/stream.js`: Range parsing. Open-ended ranges are capped at `STREAM_CHUNK` (2 MB, set in
    `config.js`).
- `apps/web/`: SPA loaded from `index.html`.
  - `src/api/`: **every backend call goes here, one file = one request**, in a folder per resource
    (`videos/`, `search/`, `user/`, `history/`, `playlists/`). Each folder's `index.js` groups its
    requests into one object (`videosApi`, `searchApi`, `userApi`, `historyApi`, `playlistsApi`).
    To add a request, create a new file in the right folder and add it to that folder's
    `index.js`. Callers import from `src/api/index.js`.
    They use the shared `client` (`src/api/client.js`), an `@vidora/http` instance with
    `baseURL: '/api'`. Its interceptors add `X-User-Id` and copy the server's error message onto
    the error. Components and pages must not call `fetch` directly.
  - `src/store.js`: global app state + `actions` (lists, progress, toasts, theme, ...).
  - `src/router.js`: routes `/`, `/results`, `/watch`, `/feed/history`, `/playlist`.
  - `src/components/` and `src/pages/` hold the custom elements. Register a new one in
    `src/main.js`.
  - Styles: tokens are in `src/styles/global.css`; shared component CSS is in
    `src/styles/shared.js`.

## Conventions

- Users are anonymous: a random id kept in localStorage and sent as the `X-User-Id` header.
- History is recorded when playback starts (`player-started`). Progress is saved with
  `PUT /api/me/history/:id`.
- Thumbnails are captured in the browser from a canvas and uploaded with
  `PUT /api/videos/:id/thumbnail`. There's no ffmpeg.
- Generated, git-ignored paths: `apps/server/media/` and `apps/server/data/db.json`.
- Verify UI changes in a real browser. Headless Chrome over the DevTools protocol works. Only stop
  processes you started yourself; never kill every `chrome.exe`.
