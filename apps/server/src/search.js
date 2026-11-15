import { Trie } from './lib/trie.js';

export const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const popularity = (v) => 1 + Math.log10(1 + (v.baseViews || 0));

export class SearchIndex {
  constructor(videos) {
    this.trie = new Trie();
    this.docs = videos.map((v) => {
      const title = normalize(v.title);
      return {
        v,
        title,
        words: title.split(' '),
        tags: (v.tags || []).map(normalize),
        channel: normalize(v.channel),
        category: normalize(v.category),
        desc: normalize(v.description),
      };
    });

    for (const d of this.docs) {
      const pop = popularity(d.v);
      this.trie.insert(d.title, d.title, 10 * pop);
      // Typing a word from the middle of a title still suggests the full title.
      for (let i = 1; i < d.words.length; i++) {
        if (d.words[i].length > 1) this.trie.insert(d.words.slice(i).join(' '), d.title, 3 * pop);
      }
      for (const tag of d.tags) this.trie.insert(tag, tag, 4 * pop);
      this.trie.insert(d.channel, d.channel, 5 * pop);
      this.trie.insert(d.category, d.category, 2 * pop);
    }
  }

  /**
   * Autocomplete. `queries` = global {query: count}, `own` = this user's past searches.
   * Returns [{ text, kind: 'history' | 'suggestion' }].
   */
  suggest(q, { queries = {}, own = [], limit = 10 } = {}) {
    const nq = normalize(q);
    if (!nq) return own.slice(0, limit).map((text) => ({ text, kind: 'history' }));

    const history = own.filter((s) => normalize(s).startsWith(nq)).slice(0, 3);
    const seen = new Set(history.map(normalize));
    const scores = new Map();
    const bump = (text, w) => {
      if (!seen.has(text)) scores.set(text, Math.max(scores.get(text) || 0, w));
    };

    for (const { value, weight } of this.trie.find(nq, 25)) bump(value, weight);
    for (const [query, count] of Object.entries(queries)) {
      const nqq = normalize(query);
      if (nqq.startsWith(nq) && nqq !== nq) bump(nqq, 6 * count);
    }
    // Fallback: substring matches anywhere in titles
    if (scores.size < limit) {
      for (const d of this.docs) if (d.title.includes(nq)) bump(d.title, 1);
    }

    const rest = [...scores]
      .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
      .slice(0, limit - history.length)
      .map(([text]) => ({ text, kind: 'suggestion' }));

    return [...history.map((text) => ({ text, kind: 'history' })), ...rest];
  }

  /** Ranked full-text search over title / tags / channel / category / description. */
  search(q) {
    const nq = normalize(q);
    if (!nq) return [];
    const tokens = nq.split(' ');

    const scored = this.docs.map((d) => {
      let score = 0;
      let matched = 0;
      if (d.title === nq) score += 30;
      if (d.title.includes(nq)) score += 20;
      for (const t of tokens) {
        let hit = false;
        if (d.words.some((w) => w.startsWith(t))) { score += 6; hit = true; }
        if (d.tags.some((tag) => tag.split(' ').some((w) => w.startsWith(t)))) { score += 4; hit = true; }
        if (d.channel.split(' ').some((w) => w.startsWith(t))) { score += 4; hit = true; }
        if (d.category.startsWith(t)) { score += 2; hit = true; }
        if (d.desc.includes(t)) { score += 1; hit = true; }
        if (hit) matched++;
      }
      return { d, score, matched };
    });

    let results = scored.filter((s) => s.matched === tokens.length);
    if (!results.length) results = scored.filter((s) => s.matched > 0);
    return results
      .sort((a, b) => b.score - a.score || popularity(b.d.v) - popularity(a.d.v))
      .map((s) => s.d.v);
  }
}
