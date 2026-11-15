// Low-level HTTP client shared by every API module in this folder.
// Pages and components should import from '../api/index.js', not call this directly.

const BASE = '/api';

// Anonymous identity: a random id per browser, sent with every request as X-User-Id.
const uid = (() => {
  const make = () =>
    crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    let id = localStorage.getItem('uid');
    if (!id) {
      id = make();
      localStorage.setItem('uid', id);
    }
    return id;
  } catch {
    return make();
  }
})();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Encode a single path segment (video ids, list ids, ...). */
export const seg = (s) => encodeURIComponent(s);

/**
 * Send a request to the backend.
 * - `body` that is a Blob is sent as-is; anything else is JSON-encoded.
 * - Resolves with the parsed JSON (or null for 204), rejects with ApiError.
 */
export async function request(path, { method = 'GET', body, signal, keepalive } = {}) {
  const headers = { 'X-User-Id': uid };
  let payload;
  if (body instanceof Blob) {
    headers['Content-Type'] = body.type || 'application/octet-stream';
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, signal, keepalive, headers, body: payload });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (await res.json()).error || message;
    } catch {}
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? null : res.json();
}
