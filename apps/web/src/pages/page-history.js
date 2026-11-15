import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { historyApi } from '../api/index.js';
import { dayLabel } from '../lib/format.js';
import { actions } from '../store.js';

class PageHistory extends Component {
  static styles = [
    shared,
    css`
      .wrap { display: flex; gap: 48px; max-width: 1284px; margin: 0 auto; padding: 24px 24px 40px; align-items: flex-start; }
      .main { flex: 1; min-width: 0; }
      h1 { font-size: 36px; font-weight: 700; margin: 0 0 24px; }
      h2 { font-size: 20px; font-weight: 700; margin: 24px 0 16px; }
      .list { display: grid; gap: 16px; }
      aside { width: 320px; position: sticky; top: calc(var(--topbar-h) + 24px); display: grid; gap: 16px; padding-top: 72px; }
      .filter { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--text-2); padding: 4px 0; }
      .filter:focus-within { border-bottom: 2px solid var(--text); }
      .filter input { flex: 1; border: 0; outline: none; background: transparent; font-size: 14px; height: 32px; }
      aside .pill { justify-self: start; background: transparent; padding-left: 8px; }
      aside .pill:hover { background: var(--bg-soft); }
      @media (max-width: 1000px) {
        .wrap { flex-direction: column-reverse; gap: 0; }
        aside { position: static; width: 100%; padding-top: 0; }
      }
      @media (max-width: 600px) { .wrap { padding: 12px; } h1 { font-size: 28px; } }
    `,
  ];

  state = { items: null, filter: '', error: null };

  onMount() {
    document.title = 'Watch history - Vidora';
    this.load();
  }

  async load() {
    try {
      this.setState({ items: await historyApi.list() });
    } catch (e) {
      this.setState({ error: e.message });
    }
  }

  remove = async (e) => {
    const { id } = e.detail;
    this.setState({ items: this.state.items.filter((h) => h.video.id !== id) });
    actions.forgetProgress(id);
    await historyApi.remove(id).catch(() => this.load());
    actions.toast('Removed from watch history');
  };

  clearAll = async () => {
    if (!confirm('Clear all watch history?\n\nYour Vidora watch history will be cleared and resume points removed.')) return;
    await historyApi.clear();
    for (const h of this.state.items || []) actions.forgetProgress(h.video.id);
    this.setState({ items: [] });
    actions.toast('Watch history cleared');
  };

  groups() {
    const f = this.state.filter.trim().toLowerCase();
    const groups = [];
    for (const h of this.state.items) {
      if (f && !`${h.video.title} ${h.video.channel}`.toLowerCase().includes(f)) continue;
      const label = dayLabel(h.watchedAt);
      let g = groups.at(-1);
      if (!g || g.label !== label) groups.push((g = { label, items: [] }));
      g.items.push(h);
    }
    return groups;
  }

  render() {
    const { items, error, filter } = this.state;
    if (error) return html`<div class="empty"><h2>Couldn't load history</h2><p>${error}</p></div>`;

    let body;
    if (!items) body = html`<p class="muted">Loading…</p>`;
    else if (!items.length) {
      body = html`<div class="empty">${icon('history')}<h2>This list has no videos.</h2>
        <p>Videos you watch will show up here.</p></div>`;
    } else {
      const groups = this.groups();
      body = groups.length
        ? groups.map(
            (g) => html`<h2>${g.label}</h2><div class="list">
              ${g.items.map((h) => html`<video-card key="${h.video.id}" variant="list" removable="history" .video=${h.video} @card-remove=${this.remove}></video-card>`)}
            </div>`,
          )
        : html`<p class="muted">No results in your watch history for “${filter}”.</p>`;
    }

    return html`<div class="wrap">
      <div class="main"><h1>Watch history</h1>${body}</div>
      <aside>
        <label class="filter">${icon('search')}
          <input type="search" placeholder="Search watch history" aria-label="Search watch history"
            @input=${(e) => this.setState({ filter: e.target.value })} />
        </label>
        <button class="pill" ?disabled=${!items?.length} @click=${this.clearAll}>${icon('trash')}Clear all watch history</button>
      </aside>
    </div>`;
  }
}

define('page-history', PageHistory);
