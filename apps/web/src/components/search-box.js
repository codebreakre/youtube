import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { searchApi } from '../api/index.js';
import { debounce } from '../lib/format.js';
import { router } from '../router.js';

/**
 * Search input with server-side autocomplete.
 * ↑/↓ to move through suggestions, Enter to search, Esc to close,
 * past searches are shown with a clock icon and can be removed.
 */
class SearchBox extends Component {
  static styles = [
    shared,
    css`
      form { position: relative; display: flex; align-items: center; width: 100%; }
      .field {
        flex: 1; min-width: 0; height: 40px; display: flex; align-items: center;
        background: var(--input-bg); border: 1px solid var(--input-border); border-right: none;
        border-radius: 40px 0 0 40px; padding-left: 16px;
      }
      .field.focused { border-color: #1c62b9; box-shadow: inset 0 1px 2px rgba(0,0,0,.3); padding-left: 4px; margin-left: 0; }
      .lead { display: none; padding: 0 8px 0 10px; }
      .lead svg.i { width: 20px; height: 20px; }
      .field.focused .lead { display: block; }
      input {
        flex: 1; min-width: 0; height: 100%; border: 0; outline: none; background: transparent;
        font-size: 16px; padding: 0 4px;
      }
      input::placeholder { color: var(--text-2); }
      .clear { width: 40px; height: 40px; }
      .go {
        width: 64px; height: 40px; flex: none; display: grid; place-items: center;
        background: var(--search-btn); border: 1px solid var(--input-border); border-radius: 0 40px 40px 0;
      }
      .go:hover { background: var(--bg-soft); }

      ul {
        position: absolute; top: 44px; left: 0; right: 64px; z-index: 10;
        margin: 0; padding: 16px 0 8px; list-style: none;
        background: var(--bg-raised); border-radius: 12px; box-shadow: var(--shadow);
        border: 1px solid var(--border);
      }
      li {
        display: flex; align-items: center; gap: 14px; padding: 0 16px; height: 32px;
        font-size: 16px; cursor: default;
      }
      li:hover, li.active { background: var(--bg-soft); }
      li svg.i { width: 20px; height: 20px; color: var(--text); }
      li .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
      li .t b { font-weight: 700; }
      li .rm { font-size: 13px; color: var(--link); padding: 4px; visibility: hidden; }
      li:hover .rm, li.active .rm { visibility: visible; }
      li .rm:hover { text-decoration: underline; }
    `,
  ];

  state = { items: [], open: false, active: -1, focused: false, hasText: false };
  typed = '';

  onMount() {
    this.subscribe(router.store, () => this.syncFromRoute());
  }

  mounted() {
    this.syncFromRoute();
  }

  get input() {
    return this.$('input');
  }

  focus() {
    this.input?.focus();
  }

  syncFromRoute() {
    const { route, query } = router.store.get();
    if (!this.input) return;
    if (route?.name === 'results') this.input.value = query.search_query ?? '';
    else if (route?.name === 'home') this.input.value = '';
    this.typed = this.input.value;
    this.setState({ hasText: !!this.typed });
  }

  fetchSuggestions = debounce(async () => {
    this.ctrl?.abort();
    this.ctrl = new AbortController();
    try {
      const { suggestions } = await searchApi.suggest(this.typed, this.ctrl.signal);
      this.setState({ items: suggestions, active: -1, open: this.state.focused });
    } catch (e) {
      if (e.name !== 'AbortError') console.warn(e);
    }
  }, 100);

  onInput = (e) => {
    this.typed = e.target.value;
    this.setState({ hasText: !!this.typed, active: -1 });
    this.fetchSuggestions();
  };

  onFocus = () => {
    this.setState({ focused: true, open: true });
    this.fetchSuggestions();
  };

  onBlur = () => this.setState({ focused: false, open: false, active: -1 });

  onKeyDown = (e) => {
    const { items, active } = this.state;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      let i = active + (e.key === 'ArrowDown' ? 1 : -1);
      if (i < -1) i = items.length - 1;
      if (i >= items.length) i = -1;
      this.input.value = i === -1 ? this.typed : items[i].text;
      this.setState({ active: i, open: true });
    } else if (e.key === 'Escape') {
      if (this.state.open) this.setState({ open: false, active: -1 });
      else this.input.blur();
    }
  };

  onSubmit = (e) => {
    e.preventDefault();
    this.go(this.input.value);
  };

  go(text) {
    const q = text.trim();
    if (!q) return;
    this.input.value = q;
    this.typed = q;
    this.setState({ open: false, active: -1, hasText: true });
    this.input.blur();
    this.emit('search-submit', { q });
    router.navigate(`/results?search_query=${encodeURIComponent(q)}`);
  }

  clear() {
    this.input.value = '';
    this.typed = '';
    this.setState({ hasText: false });
    this.input.focus();
    this.fetchSuggestions();
  }

  async removeHistory(e, text) {
    e.stopPropagation();
    e.preventDefault();
    await searchApi.forget(text);
    this.fetchSuggestions();
  }

  highlight(text) {
    const typed = this.typed.trim().toLowerCase();
    if (typed && text.toLowerCase().startsWith(typed)) {
      return html`${text.slice(0, typed.length)}<b>${text.slice(typed.length)}</b>`;
    }
    return html`<b>${text}</b>`;
  }

  render() {
    const { items, open, active, focused, hasText } = this.state;
    const showList = open && items.length > 0;
    return html`
      <form role="search" action="/results" @submit=${this.onSubmit}>
        <div class="field ${focused ? 'focused' : ''}">
          <span class="lead">${icon('search')}</span>
          <input
            name="search_query"
            type="text"
            placeholder="Search"
            autocomplete="off"
            spellcheck="false"
            role="combobox"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="suggestions"
            aria-expanded="${showList ? 'true' : 'false'}"
            @input=${this.onInput}
            @focus=${this.onFocus}
            @blur=${this.onBlur}
            @keydown=${this.onKeyDown}
          />
          <button type="button" class="icon-btn clear" aria-label="Clear search" ?hidden=${!hasText} @mousedown=${(e) => e.preventDefault()} @click=${() => this.clear()}>
            ${icon('close')}
          </button>
        </div>
        <button class="go" type="submit" aria-label="Search" title="Search">${icon('search')}</button>
        ${showList
          ? html`<ul id="suggestions" role="listbox" @mousedown=${(e) => e.preventDefault()}>
              ${items.map(
                (s, i) => html`<li
                  role="option"
                  class="${i === active ? 'active' : ''}"
                  aria-selected="${i === active ? 'true' : 'false'}"
                  @click=${() => this.go(s.text)}
                >
                  ${icon(s.kind === 'history' ? 'history' : 'search')}
                  <span class="t">${this.highlight(s.text)}</span>
                  ${s.kind === 'history'
                    ? html`<button type="button" class="rm" @click=${(e) => this.removeHistory(e, s.text)}>Remove</button>`
                    : ''}
                </li>`,
              )}
            </ul>`
          : ''}
      </form>
    `;
  }
}

define('search-box', SearchBox);
