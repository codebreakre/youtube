/**
 * Minimal DOM morphing: patch the live children of `from` so they match `to`.
 * Existing nodes are reused (so <video>, focused <input>, child components keep
 * their state). Elements with a `key` attribute are matched by key.
 */
export function morph(from, to) {
  morphChildren(from, to);
}

const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('key') : null);
const same = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName;

function morphChildren(from, to) {
  const keyed = new Map();
  for (let c = from.firstChild; c; c = c.nextSibling) {
    const k = keyOf(c);
    if (k != null) keyed.set(k, c);
  }

  let cur = from.firstChild;
  let next = to.firstChild;
  while (next) {
    const after = next.nextSibling;
    const k = keyOf(next);
    let match = null;
    if (k != null) {
      const cand = keyed.get(k);
      if (cand && same(cand, next)) {
        match = cand;
        keyed.delete(k);
      }
    } else if (cur && keyOf(cur) == null && same(cur, next)) {
      match = cur;
    }

    if (match) {
      if (match === cur) cur = cur.nextSibling;
      else from.insertBefore(match, cur);
      patch(match, next);
    } else {
      from.insertBefore(next, cur);
    }
    next = after;
  }

  while (cur) {
    const n = cur.nextSibling;
    cur.remove();
    cur = n;
  }
}

function patch(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  if (a.nodeType !== 1) return;

  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);

  if (a.localName === 'textarea' || a.hasAttribute('data-static')) return;
  morphChildren(a, b);
}
