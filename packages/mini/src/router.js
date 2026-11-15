import { createStore } from './store.js';

/**
 * History-API router.
 *   const router = createRouter([{ name: 'home', path: '/', component: 'page-home' }, { path: '/user/:id', ... }]);
 *   router.store.get() → { route, params, query, path, href }
 *   router.navigate('/watch?v=abc')
 * Same-origin <a href> clicks anywhere (including inside shadow roots) are intercepted.
 */
export function createRouter(routes) {
  const compiled = routes.map((r) => {
    const keys = [];
    const pattern = r.path.replace(/:(\w+)/g, (_, k) => {
      keys.push(k);
      return '([^/]+)';
    });
    return { ...r, re: new RegExp(`^${pattern}/?$`), keys };
  });

  function resolve() {
    const url = new URL(location.href);
    const base = {
      route: null,
      params: {},
      query: Object.fromEntries(url.searchParams),
      path: url.pathname,
      href: url.pathname + url.search,
    };
    for (const r of compiled) {
      const m = r.re.exec(url.pathname);
      if (m) {
        base.route = r;
        base.params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        break;
      }
    }
    return base;
  }

  const store = createStore(resolve());

  function navigate(to, { replace = false } = {}) {
    const url = new URL(to, location.href);
    if (url.origin !== location.origin) {
      location.href = url.href;
      return;
    }
    const href = url.pathname + url.search + url.hash;
    const current = location.pathname + location.search + location.hash;
    if (href !== current) history[replace ? 'replaceState' : 'pushState'](null, '', href);
    store.set(resolve());
    window.scrollTo(0, 0);
  }

  addEventListener('popstate', () => store.set(resolve()));

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.composedPath().find((n) => n.tagName === 'A');
    if (!a || !a.hasAttribute('href') || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    navigate(url.href);
  });

  return { store, navigate };
}
