import { html } from 'mini';

export function formatViews(n, { short = false } = {}) {
  n = Number(n) || 0;
  const label = short ? '' : n === 1 ? ' view' : ' views';
  for (const [v, s] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (n >= v) {
      const x = n / v;
      return `${x < 10 ? Math.floor(x * 10) / 10 : Math.floor(x)}${s}${label}`;
    }
  }
  return `${n}${label}`;
}

export function timeAgo(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  const units = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [sec, name] of units) {
    const n = Math.floor(s / sec);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function formatTime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export const debounce = (fn, ms) => {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
};

export const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

/** Stable fake subscriber count per channel (there are no real accounts). */
export const subscribers = (channel) => `${formatViews(((hash(channel) % 900) + 12) * 1000, { short: true })} subscribers`;

const COLORS = ['#e53935', '#8e24aa', '#3949ab', '#039be5', '#00897b', '#7cb342', '#f4511e', '#6d4c41', '#c2185b', '#5e35b1'];

export const avatar = (name, size = 36) => html`<span
  class="avatar"
  aria-hidden="true"
  style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:${COLORS[hash(name) % COLORS.length]}"
  >${(String(name || '?').trim()[0] || '?').toUpperCase()}</span
>`;
