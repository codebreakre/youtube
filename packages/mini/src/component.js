import { compile, html } from './html.js';
import { morph } from './morph.js';

const sheets = new Map();
function toSheet(cssText) {
  let sheet = sheets.get(cssText);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheets.set(cssText, sheet);
  }
  return sheet;
}

/**
 * Base class for all web components.
 *
 *   class MyThing extends Component {
 *     static styles = [css`...`];
 *     static props = ['video'];     // JS properties that trigger re-render
 *     static attrs = ['variant'];   // observed attributes that trigger re-render
 *     state = { open: false };
 *     onMount() {}                  // connected (subscribe / fetch here)
 *     mounted() {}                  // after first render
 *     updated() {}                  // after every render
 *     onUnmount() {}
 *     render() { return html`...`; }
 *   }
 *   define('my-thing', MyThing);
 */
export class Component extends HTMLElement {
  static styles = [];
  static props = [];
  static attrs = [];

  static get observedAttributes() {
    return this.attrs;
  }

  constructor() {
    super();
    this.state = {};
    this._props = {};
    this._handlers = [];
    this._types = new Set();
    this._cleanups = [];
    this._queued = false;
    this._live = false;
    this._rendered = false;

    this.root = this.attachShadow({ mode: 'open' });
    this.root.adoptedStyleSheets = [this.constructor.styles].flat(Infinity).filter(Boolean).map(toSheet);

    // Props set before the element was upgraded live as own properties; re-route them through the setters.
    for (const name of this.constructor.props) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const v = this[name];
        delete this[name];
        this[name] = v;
      }
    }
  }

  connectedCallback() {
    if (!this._live) {
      this._live = true;
      this.onMount?.();
    }
    this.update();
  }

  disconnectedCallback() {
    // Elements that are merely moved (keyed reorder) are re-connected in the same task.
    queueMicrotask(() => {
      if (this.isConnected || !this._live) return;
      this._live = false;
      for (const fn of this._cleanups.splice(0)) fn();
      this.onUnmount?.();
    });
  }

  attributeChangedCallback() {
    this.update();
  }

  setState(patch) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.update();
  }

  /** Schedule a batched re-render. */
  update() {
    if (this._queued || !this.isConnected) return;
    this._queued = true;
    queueMicrotask(() => {
      this._queued = false;
      if (this.isConnected) this.renderNow();
    });
  }

  render() {
    return html``;
  }

  renderNow() {
    const { markup, handlers, props } = compile(this.render());
    this._handlers = handlers;

    const tpl = document.createElement('template');
    tpl.innerHTML = markup;
    morph(this.root, tpl.content);

    for (const h of handlers) this._listen(h.type);

    if (props.length) {
      const selector = props.map((_, i) => `[data-p-${i}]`).join(',');
      for (const el of this.root.querySelectorAll(selector)) {
        for (const attr of el.attributes) {
          if (!attr.name.startsWith('data-p-')) continue;
          const p = props[+attr.name.slice(7)];
          if (p) el[p.name] = p.value;
        }
      }
    }

    const first = !this._rendered;
    this._rendered = true;
    if (first) this.mounted?.();
    this.updated?.();
  }

  // ---- event delegation -------------------------------------------------

  _listen(type) {
    if (this._types.has(type)) return;
    this._types.add(type);
    // Capture phase so non-bubbling events (focus, media events, mouseenter…) are seen too.
    this.root.addEventListener(type, (e) => this._dispatch(e), true);
  }

  _dispatch(e) {
    const attr = `data-on-${e.type}`;
    for (const el of e.composedPath()) {
      if (el === this.root) break;
      if (el.nodeType !== 1 || el.getRootNode() !== this.root) continue;
      if (el.hasAttribute(attr)) {
        const h = this._handlers[+el.getAttribute(attr)];
        if (h) h.fn.call(this, e, el);
        if (e.cancelBubble) break;
      }
      if (!e.bubbles) break; // non-bubbling events only belong to their own target
    }
  }

  // ---- helpers ----------------------------------------------------------

  $(selector) {
    return this.root.querySelector(selector);
  }

  $$(selector) {
    return [...this.root.querySelectorAll(selector)];
  }

  emit(type, detail) {
    return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** addEventListener that is removed automatically on unmount. */
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._cleanups.push(() => target.removeEventListener(type, fn, opts));
  }

  /** Subscribe to a store, unsubscribed automatically on unmount. */
  subscribe(store, fn) {
    this._cleanups.push(store.subscribe(fn));
  }

  /** Re-render whenever selector(store state) changes. */
  use(store, selector = (s) => s) {
    let prev = selector(store.get());
    this.subscribe(store, (s) => {
      const v = selector(s);
      if (v !== prev) {
        prev = v;
        this.update();
      }
    });
  }
}

/** Register a component, creating reactive accessors for its static props. */
export function define(tag, cls) {
  for (const name of cls.props || []) {
    if (Object.getOwnPropertyDescriptor(cls.prototype, name)) continue;
    Object.defineProperty(cls.prototype, name, {
      configurable: true,
      get() {
        return this._props[name];
      },
      set(v) {
        const old = this._props[name];
        if (old === v) return;
        this._props[name] = v;
        this.propChanged?.(name, v, old);
        this.update();
      },
    });
  }
  if (!customElements.get(tag)) customElements.define(tag, cls);
  return cls;
}
