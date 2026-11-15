import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { avatar, formatTime, formatViews, timeAgo } from '../lib/format.js';
import { captureThumbnail } from '../lib/thumbs.js';
import { app, actions } from '../store.js';

/**
 * <video-card .video=${v} variant="grid|list|compact|row" removable="history|WL|LL" index="3">
 * Emits `card-remove` ({ id }) when the remove action is used.
 */
class VideoCard extends Component {
  static props = ['video'];
  static attrs = ['variant', 'removable', 'index', 'href'];
  static styles = [
    shared,
    css`
      :host { position: relative; }
      article { display: flex; flex-direction: column; gap: 12px; position: relative; }
      .thumb-wrap { position: relative; flex: none; }
      .thumb {
        position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden;
        border-radius: 12px; background: var(--skeleton);
      }
      .thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb video.preview { position: absolute; inset: 0; background: #000; animation: fadein .25s; }
      @keyframes fadein { from { opacity: 0; } }
      .badge {
        position: absolute; right: 8px; bottom: 8px; padding: 1px 4px; border-radius: 4px;
        background: rgba(0,0,0,.8); color: #fff; font-size: 12px; font-weight: 500; letter-spacing: .3px;
      }
      .watched { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(170,170,170,.6); }
      .watched div { height: 100%; background: var(--accent); }
      .watched ~ .badge { bottom: 12px; }

      .hover-actions {
        position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 4px;
        opacity: 0; transition: opacity .15s;
      }
      .thumb-wrap:hover .hover-actions, .hover-actions:focus-within { opacity: 1; }
      .hover-actions button {
        width: 32px; height: 32px; border-radius: 4px; display: grid; place-items: center;
        background: rgba(0,0,0,.8); color: #fff;
      }
      .hover-actions button svg.i { width: 20px; height: 20px; }
      .hover-actions .tip {
        position: absolute; right: 38px; top: 6px; white-space: nowrap; font-size: 12px;
        background: rgba(0,0,0,.8); color: #fff; padding: 4px 8px; border-radius: 4px; display: none;
      }
      .hover-actions button:hover + .tip { display: block; }

      .meta { display: flex; gap: 12px; align-items: flex-start; min-width: 0; padding-right: 24px; position: relative; }
      .text { min-width: 0; flex: 1; }
      .title { font-size: 16px; font-weight: 500; line-height: 22px; margin: 0 0 4px; color: var(--text); }
      .sub { font-size: 14px; color: var(--text-2); line-height: 20px; }
      .dot::before { content: '•'; margin: 0 4px; }
      .desc { font-size: 12px; color: var(--text-2); margin-top: 8px; line-height: 18px; }
      .channel-row { display: flex; align-items: center; gap: 8px; margin: 12px 0 4px; }

      .menu-btn { position: absolute; right: -12px; top: -6px; opacity: 0; }
      article:hover .menu-btn, .menu-btn.open, .menu-btn:focus-visible { opacity: 1; }
      @media (hover: none) { .menu-btn { opacity: 1; } }
      .menu {
        position: absolute; right: 0; top: 32px; z-index: 20; min-width: 240px; padding: 8px 0;
        background: var(--bg-raised); border-radius: 12px; box-shadow: var(--shadow); border: 1px solid var(--border);
      }
      .menu button { display: flex; align-items: center; gap: 16px; width: 100%; height: 36px; padding: 0 16px; font-size: 14px; text-align: left; }
      .menu button:hover { background: var(--bg-soft); }

      /* list: search results & history */
      :host([variant='list']) article { flex-direction: row; gap: 16px; }
      :host([variant='list']) .thumb-wrap { width: 45%; max-width: 360px; }
      :host([variant='list']) .title { font-size: 18px; line-height: 26px; }
      :host([variant='list']) .sub { font-size: 12px; line-height: 18px; }
      :host([variant='list']) .meta { padding-right: 40px; }
      :host([variant='list']) .menu-btn { right: 0; top: 0; }

      /* compact: up-next sidebar */
      :host([variant='compact']) article { flex-direction: row; gap: 8px; }
      :host([variant='compact']) .thumb-wrap { width: 168px; }
      :host([variant='compact']) .thumb { border-radius: 8px; }
      :host([variant='compact']) .title { font-size: 14px; line-height: 20px; }
      :host([variant='compact']) .sub { font-size: 12px; line-height: 18px; }
      :host([variant='compact']) .menu-btn { right: -16px; top: -8px; }
      :host([variant='compact']) .hover-actions { top: 4px; right: 4px; }

      /* row: playlist page */
      :host([variant='row']) article { flex-direction: row; align-items: center; gap: 8px; padding: 8px 0 8px 8px; border-radius: 12px; }
      :host([variant='row']) article:hover { background: var(--bg-soft); }
      :host([variant='row']) .idx { width: 24px; flex: none; text-align: center; color: var(--text-2); font-size: 14px; }
      :host([variant='row']) .thumb-wrap { width: 160px; }
      :host([variant='row']) .thumb { border-radius: 8px; }
      :host([variant='row']) .sub { font-size: 12px; }
      :host([variant='row']) .meta { padding-right: 48px; }
      :host([variant='row']) .menu-btn { right: 4px; top: 50%; transform: translateY(-50%); }

      @media (max-width: 600px) {
        :host([variant='list']) article { flex-direction: column; }
        :host([variant='list']) .thumb-wrap { width: 100%; max-width: none; }
      }
    `,
  ];

  state = { preview: false, menu: false };

  onMount() {
    this.use(app, (s) => s.lists);
    this.use(app, (s) => s.progress);
    this.on(document, 'click', (e) => {
      if (this.state.menu && !e.composedPath().includes(this)) this.setState({ menu: false });
    });
  }

  onUnmount() {
    clearTimeout(this.hoverTimer);
  }

  get variant() {
    return this.getAttribute('variant') || 'grid';
  }

  // Inline preview after hovering a grid thumbnail (streams via range requests too).
  enter = () => {
    if (this.variant !== 'grid' || !matchMedia('(hover: hover)').matches) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => this.setState({ preview: true }), 700);
  };

  leave = () => {
    clearTimeout(this.hoverTimer);
    if (this.state.preview) this.setState({ preview: false });
  };

  // No thumbnail yet: seek the stream to ~30% and use that frame (uploaded once for everyone).
  onFrameMeta = (e) => {
    const el = e.target;
    el.currentTime = Math.min(el.duration * 0.3 || 1, 90);
  };

  onFrameSeeked = (e) => captureThumbnail(e.target, this.video.id);

  toggleWatchLater = (e) => {
    e.preventDefault();
    e.stopPropagation();
    actions.toggleList('WL', this.video);
  };

  menuAction(fn) {
    this.setState({ menu: false });
    fn();
  }

  renderMenu(v) {
    const removable = this.getAttribute('removable');
    const inWL = actions.inList('WL', v.id);
    const where = { history: 'watch history', WL: 'Watch later', LL: 'Liked videos' }[removable];
    return html`<div class="menu" role="menu">
      ${removable !== 'WL'
        ? html`<button role="menuitem" @click=${() => this.menuAction(() => actions.toggleList('WL', v))}>
            ${icon('clock')}${inWL ? 'Remove from Watch later' : 'Save to Watch later'}
          </button>`
        : ''}
      ${removable
        ? html`<button role="menuitem" @click=${() => this.menuAction(() => this.emit('card-remove', { id: v.id }))}>
            ${icon('trash')}Remove from ${where}
          </button>`
        : ''}
    </div>`;
  }

  render() {
    const v = this.video;
    if (!v) return html``;
    const variant = this.variant;
    const href = this.getAttribute('href') || `/watch?v=${encodeURIComponent(v.id)}`;
    const progress = app.get().progress[v.id];
    const inWL = actions.inList('WL', v.id);
    const { preview, menu } = this.state;

    const thumb = html`<div class="thumb-wrap" @mouseenter=${this.enter} @mouseleave=${this.leave}>
      <a class="thumb" href="${href}" tabindex="-1" aria-hidden="true">
        ${v.thumbnail
          ? html`<img src="${v.thumbnail}" alt="" loading="lazy" />`
          : html`<video src="${v.stream}" preload="metadata" muted playsinline
              @loadedmetadata=${this.onFrameMeta} @seeked=${this.onFrameSeeked}></video>`}
        ${preview ? html`<video class="preview" src="${v.stream}" autoplay muted playsinline loop></video>` : ''}
        ${progress > 0.01 ? html`<div class="watched"><div style="width:${Math.round(progress * 100)}%"></div></div>` : ''}
        ${v.duration ? html`<span class="badge">${formatTime(v.duration)}</span>` : ''}
      </a>
      <div class="hover-actions">
        <button aria-label="${inWL ? 'Remove from Watch later' : 'Watch later'}" @click=${this.toggleWatchLater}>
          ${icon(inWL ? 'check' : 'clock')}
        </button>
        <span class="tip">${inWL ? 'Added' : 'Watch later'}</span>
      </div>
    </div>`;

    const stats = html`${formatViews(v.views)}<span class="dot">${timeAgo(v.publishedAt)}</span>`;

    return html`<article>
      ${variant === 'row' ? html`<span class="idx">${this.getAttribute('index') ?? ''}</span>` : ''}
      ${thumb}
      <div class="meta">
        ${variant === 'grid' ? avatar(v.channel, 36) : ''}
        <div class="text">
          <a href="${href}" title="${v.title}"><h3 class="title clamp2">${v.title}</h3></a>
          ${variant === 'list'
            ? html`<div class="sub">${stats}</div>
                <div class="channel-row sub">${avatar(v.channel, 24)}<span>${v.channel}</span></div>
                <div class="desc clamp2">${v.description}</div>`
            : variant === 'row'
              ? html`<div class="sub">${v.channel}<span class="dot">${stats}</span></div>`
              : html`<div class="sub">${v.channel}</div><div class="sub">${stats}</div>`}
        </div>
        <button class="icon-btn menu-btn ${menu ? 'open' : ''}" aria-label="Action menu" aria-haspopup="menu"
          @click=${() => this.setState({ menu: !menu })}>${icon('more')}</button>
        ${menu ? this.renderMenu(v) : ''}
      </div>
    </article>`;
  }
}

define('video-card', VideoCard);
