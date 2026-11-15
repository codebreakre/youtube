import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { videosApi } from '../api/index.js';

class PageHome extends Component {
  static styles = [
    shared,
    css`
      .chips {
        position: sticky; top: var(--topbar-h); z-index: 5; background: var(--bg);
        display: flex; gap: 12px; padding: 12px 24px; overflow-x: auto; scrollbar-width: none;
      }
      .chips button {
        height: 32px; padding: 0 12px; border-radius: 8px; background: var(--bg-soft);
        font-size: 14px; font-weight: 500; white-space: nowrap;
      }
      .chips button:hover { background: var(--bg-hover); }
      .chips button.on { background: var(--chip-active-bg); color: var(--chip-active-text); }
      .grid {
        display: grid; gap: 40px 16px; padding: 12px 24px 40px;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      }
      @media (max-width: 600px) { .grid, .chips { padding-left: 12px; padding-right: 12px; } }
      .sk-thumb { aspect-ratio: 16/9; border-radius: 12px; }
      .sk-line { height: 16px; margin-top: 12px; width: 90%; }
      .sk-line.short { width: 60%; }
    `,
  ];

  state = { videos: null, categories: [], category: 'All', error: null };

  onMount() {
    document.title = 'Vidora';
    this.load();
  }

  async load() {
    try {
      const { videos, categories } = await videosApi.list();
      this.setState({ videos, categories, error: null });
    } catch (e) {
      this.setState({ error: e.message });
    }
  }

  render() {
    const { videos, categories, category, error } = this.state;
    if (error) {
      return html`<div class="empty">${icon('video')}<h2>Couldn't load videos</h2><p>${error}</p>
        <button class="pill" @click=${() => this.load()}>Retry</button></div>`;
    }
    if (videos && !videos.length) {
      return html`<div class="empty">
        ${icon('video')}
        <h2>No videos yet</h2>
        <p>Run <code>npm run seed</code> to download free sample videos, or drop your own <code>.mp4</code> files into
          <code>apps/server/media/videos</code>. They show up automatically.</p>
      </div>`;
    }

    const shown = !videos ? null : category === 'All' ? videos : videos.filter((v) => v.category === category);
    return html`
      <div class="chips" role="tablist">
        ${['All', ...categories].map(
          (c) => html`<button role="tab" aria-selected="${c === category ? 'true' : 'false'}" class="${c === category ? 'on' : ''}"
            @click=${() => this.setState({ category: c })}>${c}</button>`,
        )}
      </div>
      <div class="grid">
        ${shown
          ? shown.map((v) => html`<video-card key="${v.id}" variant="grid" .video=${v}></video-card>`)
          : Array.from({ length: 8 }, () => html`<div><div class="skeleton sk-thumb"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`)}
      </div>
    `;
  }
}

define('page-home', PageHome);
