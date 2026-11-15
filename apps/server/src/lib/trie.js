const node = () => ({ children: new Map(), values: null });

/**
 * Prefix tree used for search autocomplete.
 * insert(key, value, weight): typing any prefix of `key` suggests `value`.
 * (value may differ from key, e.g. key "bunny" → value "big buck bunny").
 */
export class Trie {
  root = node();

  insert(key, value = key, weight = 1) {
    if (!key) return;
    let n = this.root;
    for (const ch of key) {
      let next = n.children.get(ch);
      if (!next) {
        next = node();
        n.children.set(ch, next);
      }
      n = next;
    }
    n.values ??= new Map();
    n.values.set(value, (n.values.get(value) || 0) + weight);
  }

  /** Top `limit` values under `prefix`, highest weight first. */
  find(prefix, limit = 10) {
    let n = this.root;
    for (const ch of prefix) {
      n = n.children.get(ch);
      if (!n) return [];
    }
    const best = new Map();
    const stack = [n];
    while (stack.length) {
      const cur = stack.pop();
      if (cur.values) {
        for (const [value, w] of cur.values) best.set(value, Math.max(best.get(value) || 0, w));
      }
      for (const child of cur.children.values()) stack.push(child);
    }
    return [...best]
      .map(([value, weight]) => ({ value, weight }))
      .sort((a, b) => b.weight - a.weight || a.value.length - b.value.length)
      .slice(0, limit);
  }
}
