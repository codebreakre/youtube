import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon, logo } from '../lib/icons.js';
import { avatar } from '../lib/format.js';
import { app, actions } from '../store.js';

export const logoStyles = css`
  .logo { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px 0 14px; height: 40px; }
  .logo .logo-mark { width: 28px; height: 28px; }
  .logo .logo-text { font-size: 20px; font-weight: 700; letter-spacing: -0.6px; }
`;

class TopBar extends Component {
  static styles = [
    shared,
    logoStyles,
    css`
      :host { position: fixed; inset: 0 0 auto 0; z-index: 100; }
      header {
        height: var(--topbar-h); display: flex; align-items: center; justify-content: space-between;
        gap: 16px; padding: 0 16px; background: var(--bg);
      }
      .start, .end { display: flex; align-items: center; flex: none; }
      .end { gap: 8px; }
      .center { flex: 0 1 732px; display: flex; align-items: center; gap: 8px; min-width: 0; }
      search-box { flex: 1; min-width: 0; }
      .me { margin-left: 8px; }
      .search-toggle, .back { display: none; }

      @media (max-width: 656px) {
        header { gap: 8px; padding: 0 8px; }
        .center { display: none; }
        .search-toggle { display: inline-grid; }
        header.searching .start, header.searching .end { display: none; }
        header.searching .center { display: flex; flex: 1; }
        header.searching .back { display: inline-grid; }
      }
    `,
  ];

  state = { searching: false };

  onMount() {
    this.use(app, (s) => s.theme);
  }

  openSearch() {
    this.setState({ searching: true });
    requestAnimationFrame(() => this.$('search-box')?.focus());
  }

  render() {
    const dark = app.get().theme === 'dark';
    return html`
      <header class="${this.state.searching ? 'searching' : ''}">
        <div class="start">
          <button class="icon-btn" aria-label="Guide" title="Menu" @click=${() => actions.toggleGuide()}>
            ${icon('menu')}
          </button>
          <a class="logo" href="/" title="Vidora home">${logo()}</a>
        </div>
        <div class="center">
          <button class="icon-btn back" aria-label="Back" @click=${() => this.setState({ searching: false })}>
            ${icon('back')}
          </button>
          <search-box @search-submit=${() => this.setState({ searching: false })}></search-box>
        </div>
        <div class="end">
          <button class="icon-btn search-toggle" aria-label="Search" @click=${() => this.openSearch()}>
            ${icon('search')}
          </button>
          <button
            class="icon-btn"
            aria-label="Toggle dark theme"
            title="${dark ? 'Light theme' : 'Dark theme'}"
            @click=${() => actions.toggleTheme()}
          >
            ${icon(dark ? 'sun' : 'moon')}
          </button>
          <span class="me" title="You">${avatar('You', 32)}</span>
        </div>
      </header>
    `;
  }
}

define('top-bar', TopBar);
