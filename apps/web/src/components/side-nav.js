import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon, logo } from '../lib/icons.js';
import { router } from '../router.js';
import { app, actions } from '../store.js';
import { logoStyles } from './top-bar.js';

const ITEMS = [
  { href: '/', label: 'Home', icon: 'home', active: (r) => r.route?.name === 'home' },
  { section: 'You' },
  { href: '/feed/history', label: 'History', icon: 'history', active: (r) => r.route?.name === 'history' },
  { href: '/playlist?list=WL', label: 'Watch later', icon: 'clock', active: (r) => r.route?.name === 'playlist' && r.query.list === 'WL' },
  { href: '/playlist?list=LL', label: 'Liked videos', icon: 'like', active: (r) => r.route?.name === 'playlist' && r.query.list === 'LL' },
];

/** The guide. variant="full" | "mini" | "none"; also renders the overlay drawer. */
class SideNav extends Component {
  static attrs = ['variant'];
  static styles = [
    shared,
    logoStyles,
    css`
      :host { flex: none; position: sticky; top: var(--topbar-h); align-self: flex-start; }
      :host([variant='full']) { width: 240px; }
      :host([variant='mini']) { width: 72px; }
      :host([variant='none']) { width: 0; }

      .full { height: calc(100vh - var(--topbar-h)); overflow-y: auto; padding: 12px; scrollbar-width: thin; }
      .full a {
        display: flex; align-items: center; gap: 24px; height: 40px; padding: 0 12px;
        border-radius: 10px; font-size: 14px;
      }
      .full a:hover { background: var(--bg-soft); }
      .full a.active { background: var(--bg-soft); font-weight: 500; }
      .full a.active:hover { background: var(--bg-hover); }
      .full hr { border: 0; border-top: 1px solid var(--border); margin: 12px 0; }
      .full h3 { font-size: 16px; font-weight: 500; margin: 0; padding: 6px 12px; }
      .full footer { padding: 16px 12px; font-size: 12px; color: var(--text-2); line-height: 1.6; }

      .mini { padding: 4px; }
      .mini a {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 16px 0 14px; border-radius: 10px; font-size: 10px;
      }
      .mini a:hover { background: var(--bg-soft); }

      .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200; animation: fade .2s; }
      .drawer {
        position: fixed; inset: 0 auto 0 0; width: 240px; z-index: 201; background: var(--bg);
        animation: slide .2s ease-out;
      }
      .drawer .head { height: var(--topbar-h); display: flex; align-items: center; padding: 0 16px; }
      .drawer .full { height: calc(100vh - var(--topbar-h)); }
      @keyframes fade { from { opacity: 0; } }
      @keyframes slide { from { transform: translateX(-100%); } }
    `,
  ];

  onMount() {
    this.use(router.store);
    this.use(app, (s) => s.drawer);
    this.on(document, 'keydown', (e) => e.key === 'Escape' && actions.closeDrawer());
  }

  full() {
    const r = router.store.get();
    return html`<nav class="full" aria-label="Guide">
      ${ITEMS.map((it) =>
        it.section
          ? html`<hr /><h3>${it.section}</h3>`
          : html`<a href="${it.href}" class="${it.active(r) ? 'active' : ''}">${icon(it.icon)}<span>${it.label}</span></a>`,
      )}
      <hr />
      <footer>Vidora — built with home-made web components.<br />Videos are streamed with HTTP range requests.</footer>
    </nav>`;
  }

  mini() {
    return html`<nav class="mini" aria-label="Guide">
      ${ITEMS.filter((it) => !it.section).map((it) => html`<a href="${it.href}">${icon(it.icon)}<span>${it.label}</span></a>`)}
    </nav>`;
  }

  updated() {
    document.body.classList.toggle('no-scroll', app.get().drawer);
  }

  render() {
    const variant = this.getAttribute('variant');
    return html`
      ${variant === 'full' ? this.full() : variant === 'mini' ? this.mini() : ''}
      ${app.get().drawer
        ? html`<div class="scrim" @click=${() => actions.closeDrawer()}></div>
            <aside class="drawer">
              <div class="head">
                <button class="icon-btn" aria-label="Close guide" @click=${() => actions.closeDrawer()}>${icon('menu')}</button>
                <a class="logo" href="/">${logo()}</a>
              </div>
              ${this.full()}
            </aside>`
        : ''}
    `;
  }
}

define('side-nav', SideNav);
