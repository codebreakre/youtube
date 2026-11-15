import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { searchApi } from '../api/index.js';
import { router } from '../router.js';

class PageResults extends Component {
  static styles = [
    shared,
    css`
      .wrap { max-width: 1096px; margin: 0 auto; padding: 16px 24px 40px; }
      .count { color: var(--text-2); font-size: 14px; margin: 0 0 16px; }
      .list { display: grid; gap: 16px; }
      @media (max-width: 600px) { .wrap { padding: 12px; } }
    `,
  ];

  state = { q: null, results: null, error: null };

  onMount() {
    this.subscribe(router.store, (r) => r.route?.name === 'results' && this.load());
    this.load();
  }

  async load() {
    const q = router.store.get().query.search_query ?? '';
    if (q === this.state.q && this.state.results) return;
    document.title = `${q} - Vidora`;
    this.setState({ q, results: null, error: null });
    try {
      const { results } = await searchApi.search(q);
      if (q === this.state.q) this.setState({ results });
    } catch (e) {
      this.setState({ error: e.message });
    }
  }

  render() {
    const { q, results, error } = this.state;
    if (error) return html`<div class="empty"><h2>Search failed</h2><p>${error}</p></div>`;
    if (!results) return html`<div class="wrap"><p class="count">Searching…</p></div>`;
    if (!results.length) {
      return html`<div class="empty">${icon('search')}<h2>No results found</h2>
        <p>Try different keywords or remove search filters.</p></div>`;
    }
    return html`<div class="wrap">
      <p class="count">${results.length} result${results.length === 1 ? '' : 's'} for “${q}”</p>
      <div class="list">
        ${results.map((v) => html`<video-card key="${v.id}" variant="list" .video=${v}></video-card>`)}
      </div>
    </div>`;
  }
}

define('page-results', PageResults);
