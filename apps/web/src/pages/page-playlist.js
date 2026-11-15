import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { playlistsApi } from '../api/index.js';
import { router } from '../router.js';
import { app, actions, LIST_NAMES } from '../store.js';

/** Watch later (list=WL) and Liked videos (list=LL). */
class PagePlaylist extends Component {
  static styles = [
    shared,
    css`
      .wrap { display: flex; gap: 24px; padding: 24px; align-items: flex-start; max-width: 1400px; margin: 0 auto; }
      .hero {
        position: sticky; top: calc(var(--topbar-h) + 24px); width: 360px; flex: none;
        border-radius: 16px; overflow: hidden; padding: 24px; color: #fff; isolation: isolate;
        background: linear-gradient(160deg, #3a3a5a, #1d1d2b);
      }
      .hero .bg { position: absolute; inset: 0; z-index: -1; background-size: cover; background-position: center; filter: blur(40px) brightness(.6) saturate(1.4); transform: scale(1.3); }
      .hero .cover { width: 100%; aspect-ratio: 16/9; border-radius: 12px; object-fit: cover; background: rgba(255,255,255,.1); display: grid; place-items: center; }
      .hero .cover svg.i { width: 56px; height: 56px; opacity: .6; }
      .hero h1 { font-size: 28px; font-weight: 700; margin: 24px 0 12px; }
      .hero p { margin: 4px 0; font-size: 14px; opacity: .8; }
      .hero .pill { margin-top: 20px; width: 100%; justify-content: center; background: #fff; color: #0f0f0f; }
      .hero .pill:hover { background: #e5e5e5; }
      .list { flex: 1; min-width: 0; display: grid; gap: 0; }
      @media (max-width: 1000px) {
        .wrap { flex-direction: column; }
        .hero { position: relative; top: 0; width: 100%; }
      }
      @media (max-width: 600px) { .wrap { padding: 12px; } }
    `,
  ];

  state = { list: null, items: null, error: null };

  onMount() {
    this.use(app, (s) => s.lists);
    this.subscribe(router.store, (r) => r.route?.name === 'playlist' && this.load());
    this.load();
  }

  async load() {
    const list = String(router.store.get().query.list || '').toUpperCase();
    if (list === this.state.list && this.state.items) return;
    if (!LIST_NAMES[list]) {
      this.setState({ list, error: 'This playlist does not exist.' });
      return;
    }
    document.title = `${LIST_NAMES[list]} - Vidora`;
    this.setState({ list, items: null, error: null });
    try {
      const { items } = await playlistsApi.get(list);
      if (this.state.list === list) this.setState({ items });
    } catch (e) {
      this.setState({ error: e.message });
    }
  }

  remove = (e) => {
    const item = this.state.items.find((i) => i.video.id === e.detail.id);
    if (item) actions.toggleList(this.state.list, item.video);
  };

  render() {
    const { list, items, error } = this.state;
    if (error) return html`<div class="empty"><h2>${error}</h2></div>`;
    const title = LIST_NAMES[list];
    // Keep in sync with the global store (e.g. removed from a card menu, or Undo).
    const ids = new Set(app.get().lists[list] || []);
    const visible = (items || []).filter((i) => ids.has(i.video.id));
    const first = visible[0]?.video;

    return html`<div class="wrap">
      <section class="hero">
        ${first?.thumbnail ? html`<div class="bg" style="background-image:url('${first.thumbnail}')"></div>` : ''}
        ${first?.thumbnail
          ? html`<img class="cover" src="${first.thumbnail}" alt="" />`
          : html`<div class="cover">${icon(list === 'WL' ? 'clock' : 'like')}</div>`}
        <h1>${title}</h1>
        <p><b>You</b></p>
        <p>${items ? `${visible.length} video${visible.length === 1 ? '' : 's'}` : '…'} · Private</p>
        ${first
          ? html`<a class="pill" href="/watch?v=${first.id}&list=${list}">${icon('play')}Play all</a>`
          : ''}
      </section>
      <div class="list">
        ${!items
          ? html`<p class="muted">Loading…</p>`
          : !visible.length
            ? html`<div class="empty">${icon(list === 'WL' ? 'clock' : 'like')}<h2>No videos in this playlist yet</h2>
                <p>${list === 'WL'
                  ? 'Hover a thumbnail and click the clock icon (or use “Watch later” on a video page) to save videos here.'
                  : 'Videos you like will show up here.'}</p></div>`
            : visible.map(
                (it, i) => html`<video-card key="${it.video.id}" variant="row" index="${i + 1}" removable="${list}"
                  href="/watch?v=${it.video.id}&list=${list}" .video=${it.video} @card-remove=${this.remove}></video-card>`,
              )}
      </div>
    </div>`;
  }
}

define('page-playlist', PagePlaylist);
