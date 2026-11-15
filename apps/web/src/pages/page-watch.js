import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { videosApi, historyApi, playlistsApi } from '../api/index.js';
import { avatar, formatDate, formatViews, subscribers, timeAgo } from '../lib/format.js';
import { router } from '../router.js';
import { app, actions, LIST_NAMES } from '../store.js';

class PageWatch extends Component {
  static styles = [
    shared,
    css`
      .watch {
        display: grid; gap: 0 24px; padding: 24px 24px 40px; max-width: 1754px; margin: 0 auto;
        grid-template-columns: minmax(0, 1fr) 402px;
        grid-template-areas: 'player side' 'primary side';
        align-items: start;
      }
      .player-area { grid-area: player; }
      .primary { grid-area: primary; min-width: 0; }
      .side { grid-area: side; display: grid; gap: 8px; min-width: 0; }
      video-player { aspect-ratio: 16 / 9; border-radius: 12px; }

      .watch.theater { padding-top: 0; max-width: none; grid-template-columns: minmax(0, 1fr) 402px; grid-template-areas: 'player player' 'primary side'; }
      .watch.theater .player-area { margin: 0 -24px 24px; background: #000; }
      .watch.theater video-player { aspect-ratio: auto; height: min(56.25vw, calc(100vh - 169px)); min-height: 360px; border-radius: 0; }

      @media (max-width: 1016px) {
        .watch, .watch.theater { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'player' 'primary' 'side'; }
        .side { margin-top: 24px; }
      }
      @media (max-width: 600px) {
        .watch { padding: 0 0 40px; }
        .watch .player-area { margin: 0 0 12px !important; }
        video-player { border-radius: 0; }
        .primary, .side { padding: 0 12px; }
      }

      h1 { font-size: 20px; line-height: 28px; font-weight: 700; margin: 12px 0 0; word-break: break-word; }
      .owner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
      .channel { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .channel b { display: block; font-size: 16px; font-weight: 500; }
      .channel small { color: var(--text-2); font-size: 12px; }
      .channel .pill { margin-left: 12px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }

      .desc { margin-top: 12px; background: var(--bg-soft); border-radius: 12px; padding: 12px; font-size: 14px; line-height: 20px; cursor: pointer; }
      .desc:hover { background: var(--bg-hover); }
      .desc.open { cursor: default; }
      .desc.open:hover { background: var(--bg-soft); }
      .desc .stats { font-weight: 500; }
      .desc .tags { color: var(--link); margin-left: 8px; }
      .desc .body { white-space: pre-wrap; margin-top: 4px; overflow: hidden; }
      .desc:not(.open) .body { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .desc button { font-weight: 500; margin-top: 8px; }

      .playlist { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
      .playlist header { padding: 12px 16px; background: var(--bg-soft); }
      .playlist header b { font-size: 20px; font-weight: 700; display: block; }
      .playlist header small { color: var(--text-2); font-size: 12px; }
      .playlist ol { list-style: none; margin: 0; padding: 4px 0; max-height: 400px; overflow-y: auto; }
      .playlist a { display: flex; gap: 8px; align-items: center; padding: 4px 8px 4px 0; }
      .playlist a:hover { background: var(--bg-soft); }
      .playlist a.cur { background: var(--bg-hover); }
      .playlist .n { width: 24px; text-align: center; font-size: 12px; color: var(--text-2); flex: none; }
      .playlist .pt { width: 100px; aspect-ratio: 16/9; border-radius: 8px; background: var(--skeleton); object-fit: cover; flex: none; }
      .playlist .meta { min-width: 0; font-size: 14px; }
      .playlist .meta small { display: block; color: var(--text-2); font-size: 12px; }

      .upnext { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
      .upnext h2 { font-size: 16px; font-weight: 500; margin: 0; }
      .switch { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-2); cursor: pointer; }
      .switch .track { width: 36px; height: 14px; border-radius: 7px; background: var(--bg-hover); position: relative; transition: background .15s; }
      .switch .track::after { content: ''; position: absolute; top: -3px; left: 0; width: 20px; height: 20px; border-radius: 50%; background: #ccc; box-shadow: 0 1px 3px rgba(0,0,0,.4); transition: transform .15s, background .15s; }
      .switch.on .track { background: rgba(255, 45, 85, .5); }
      .switch.on .track::after { transform: translateX(16px); background: var(--accent); }

      .sk-player { aspect-ratio: 16/9; border-radius: 12px; }
      .sk-line { height: 20px; margin-top: 12px; width: 70%; }
    `,
  ];

  state = { video: null, related: [], playlist: null, error: null, expanded: false, subscribed: false };

  onMount() {
    this.use(app, (s) => s.lists);
    this.use(app, (s) => s.theater);
    this.use(app, (s) => s.autoplay);
    this.subscribe(router.store, (r) => {
      if (r.route?.name === 'watch' && (r.query.v !== this.vid || r.query.list !== this.listId)) this.load();
    });
    this.load();
  }

  async load() {
    const { v, list } = router.store.get().query;
    if (!v) {
      router.navigate('/', { replace: true });
      return;
    }
    const sameList = list === this.listId;
    this.vid = v;
    this.listId = list;
    this.setState({ error: null, expanded: false });
    try {
      const [video, related, playlist] = await Promise.all([
        videosApi.get(v),
        videosApi.related(v),
        list && LIST_NAMES[list] ? (sameList && this.state.playlist) || playlistsApi.get(list) : null,
      ]);
      if (this.vid !== v) return;
      document.title = `${video.title} - Vidora`;
      const p = app.get().progress[video.id];
      this.startAt = p && p < 0.95 && video.duration ? p * video.duration : 0;
      this.setState({ video, related, playlist });
    } catch (e) {
      if (this.vid === v) this.setState({ error: e.status === 404 ? 'This video isn’t available anymore' : e.message });
    }
  }

  get nextUp() {
    const { video, related, playlist } = this.state;
    if (!video) return null;
    if (playlist) {
      const i = playlist.items.findIndex((it) => it.video.id === video.id);
      const nxt = playlist.items[i + 1];
      return nxt ? { video: nxt.video, href: `/watch?v=${encodeURIComponent(nxt.video.id)}&list=${playlist.id}` } : null;
    }
    return related[0] ? { video: related[0], href: `/watch?v=${encodeURIComponent(related[0].id)}` } : null;
  }

  // History is recorded when playback actually starts.
  onStarted = async () => {
    const { video } = this.state;
    try {
      await historyApi.add(video.id);
      const { views } = await videosApi.addView(video.id);
      if (this.state.video?.id === video.id) this.setState({ video: { ...this.state.video, views } });
    } catch (e) {
      console.warn(e);
    }
  };

  onProgress = (e) => {
    const { id, position, duration } = e.detail;
    actions.setProgress(id, Math.min(1, position / duration));
    historyApi.saveProgress(id, position, duration).catch(() => {});
  };

  onNext = (e) => router.navigate(e.detail.href);

  share = async () => {
    const url = `${location.origin}/watch?v=${encodeURIComponent(this.state.video.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      actions.toast('Link copied to clipboard');
    } catch {
      actions.toast(url);
    }
  };

  renderPlaylist() {
    const { playlist, video } = this.state;
    if (!playlist) return '';
    const idx = playlist.items.findIndex((it) => it.video.id === video.id);
    return html`<section class="playlist">
      <header><b>${playlist.title}</b><small>You · ${idx + 1} / ${playlist.items.length}</small></header>
      <ol>
        ${playlist.items.map(
          (it, i) => html`<li key="${it.video.id}"><a class="${i === idx ? 'cur' : ''}" href="/watch?v=${it.video.id}&list=${playlist.id}">
            <span class="n">${i === idx ? '▶' : i + 1}</span>
            ${it.video.thumbnail ? html`<img class="pt" src="${it.video.thumbnail}" alt="" />` : html`<span class="pt"></span>`}
            <span class="meta"><span class="clamp2">${it.video.title}</span><small>${it.video.channel}</small></span>
          </a></li>`,
        )}
      </ol>
    </section>`;
  }

  render() {
    const { video, related, error, expanded, subscribed } = this.state;
    const { theater, autoplay } = app.get();
    if (error) return html`<div class="empty">${icon('video')}<h2>${error}</h2><a class="pill" href="/">Go home</a></div>`;
    if (!video) {
      return html`<div class="watch"><div class="player-area"><div class="skeleton sk-player"></div><div class="skeleton sk-line"></div></div></div>`;
    }

    const liked = actions.inList('LL', video.id);
    const saved = actions.inList('WL', video.id);

    return html`<div class="watch ${theater ? 'theater' : ''}">
      <div class="player-area">
        <video-player .video=${video} .startAt=${this.startAt} .next=${this.nextUp}
          @player-started=${this.onStarted} @player-progress=${this.onProgress} @player-next=${this.onNext}></video-player>
      </div>

      <div class="primary">
        <h1>${video.title}</h1>
        <div class="owner">
          <div class="channel">
            ${avatar(video.channel, 40)}
            <div><b>${video.channel}</b><small>${subscribers(video.channel)}</small></div>
            <button class="pill ${subscribed ? '' : 'primary'}" @click=${() => this.setState({ subscribed: !subscribed })}>
              ${subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
          <div class="actions">
            <button class="pill ${liked ? 'on' : ''}" aria-pressed="${liked ? 'true' : 'false'}" @click=${() => actions.toggleList('LL', video)}>
              ${icon('like', 'sm')}${liked ? 'Liked' : 'Like'}
            </button>
            <button class="pill" @click=${this.share}>${icon('share', 'sm')}Share</button>
            <button class="pill ${saved ? 'on' : ''}" aria-pressed="${saved ? 'true' : 'false'}" @click=${() => actions.toggleList('WL', video)}>
              ${icon(saved ? 'check' : 'clock', 'sm')}${saved ? 'Saved' : 'Watch later'}
            </button>
          </div>
        </div>

        <div class="desc ${expanded ? 'open' : ''}" @click=${() => !expanded && this.setState({ expanded: true })}>
          <span class="stats">${expanded ? `${video.views.toLocaleString()} views` : formatViews(video.views)}
            &nbsp;${expanded ? formatDate(video.publishedAt) : timeAgo(video.publishedAt)}</span>
          <span class="tags">${video.tags.slice(0, 3).map((t) => `#${t.replace(/\s+/g, '')} `)}</span>
          <div class="body">${video.description}</div>
          <button @click=${(e) => { e.stopPropagation(); this.setState({ expanded: !expanded }); }}>
            ${expanded ? 'Show less' : '...more'}
          </button>
        </div>
      </div>

      <aside class="side">
        ${this.renderPlaylist()}
        <div class="upnext">
          <h2>Up next</h2>
          <label class="switch ${autoplay ? 'on' : ''}" @click=${() => actions.setAutoplay(!autoplay)}>
            Autoplay <span class="track" role="switch" aria-checked="${autoplay ? 'true' : 'false'}"></span>
          </label>
        </div>
        ${related.map((v) => html`<video-card key="${v.id}" variant="compact" .video=${v}></video-card>`)}
      </aside>
    </div>`;
  }
}

define('page-watch', PageWatch);
