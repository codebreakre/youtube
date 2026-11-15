/**
 * Tagged-template rendering.
 *
 *   html`<button class="${cls}" @click=${onClick} .video=${obj} ?disabled=${flag}>${label}</button>`
 *
 * - `${value}`        → escaped text (Templates / raw() / arrays are inlined)
 * - `@event=${fn}`    → delegated event handler (handled by Component)
 * - `.prop=${value}`  → sets a JS property on the element after render (objects, arrays…)
 * - `?attr=${bool}`   → boolean attribute
 *
 * Bindings must be written unquoted:  @click=${fn}   not   @click="${fn}"
 */

const BINDING = /\s([@.?])([\w:-]+)=$/;
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Template {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
  }
}

class Raw {
  constructor(value) {
    this.value = value;
  }
}

export const html = (strings, ...values) => new Template(strings, values);
export const raw = (value) => new Raw(String(value ?? ''));
export const css = (strings, ...values) => String.raw(strings, ...values);
export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Join truthy class names: cx('a', cond && 'b', { c: true, d: false }) → "a b c" */
export function cx(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'object') {
      for (const [k, v] of Object.entries(a)) if (v) out.push(k);
    } else out.push(a);
  }
  return out.join(' ');
}

/** Compile a Template to markup + handler/prop tables. */
export function compile(tpl) {
  const ctx = { handlers: [], props: [] };
  const markup = tpl instanceof Template ? write(tpl, ctx) : stringify(tpl, ctx);
  return { markup, ...ctx };
}

function write(tpl, ctx) {
  const { strings, values } = tpl;
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    let s = strings[i];
    if (i >= values.length) {
      out += s;
      continue;
    }
    const v = values[i];
    const m = BINDING.exec(s);
    if (!m) {
      out += s + stringify(v, ctx);
      continue;
    }
    s = s.slice(0, m.index + 1); // keep the leading whitespace
    const [, kind, name] = m;
    if (kind === '@') {
      if (typeof v === 'function') {
        ctx.handlers.push({ type: name, fn: v });
        out += `${s}data-on-${name}="${ctx.handlers.length - 1}"`;
      } else out += s;
    } else if (kind === '.') {
      ctx.props.push({ name, value: v });
      out += `${s}data-p-${ctx.props.length - 1}=""`;
    } else {
      out += s + (v ? name : '');
    }
  }
  return out;
}

function stringify(v, ctx) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Template) return write(v, ctx);
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map((x) => stringify(x, ctx)).join('');
  return escape(v);
}
