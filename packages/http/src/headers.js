// Headers are plain objects, like axios config.headers. Name lookups ignore case.
import { isPlainObject } from './utils.js';

export const METHODS_WITHOUT_BODY = ['get', 'delete', 'head', 'options'];
export const METHODS_WITH_BODY = ['post', 'put', 'patch'];
const SECTION_KEYS = new Set(['common', ...METHODS_WITHOUT_BODY, ...METHODS_WITH_BODY]);

const findKey = (headers, name) => {
  const lower = name.toLowerCase();
  return Object.keys(headers).find((k) => k.toLowerCase() === lower);
};

export const getHeader = (headers, name) => {
  const key = findKey(headers, name);
  return key === undefined ? undefined : headers[key];
};

export const setHeader = (headers, name, value) => {
  const key = findKey(headers, name);
  if (key !== undefined) delete headers[key];
  headers[name] = value;
};

export const deleteHeader = (headers, name) => {
  const key = findKey(headers, name);
  if (key !== undefined) delete headers[key];
};

const toObject = (h) => (typeof Headers === 'function' && h instanceof Headers ? Object.fromEntries(h.entries()) : h || {});

/**
 * Flatten axios-style headers ({ common, get, post, ..., 'X-Own': 1 }) into the final headers
 * for one request. Later sources win: common, then the method's section, then top-level keys.
 * A header set to null, undefined or false is removed; that's how axios unsets a default.
 */
export function flattenHeaders(headers, method) {
  headers = toObject(headers);
  const out = {};
  const add = (src) => {
    for (const [k, v] of Object.entries(toObject(src))) if (!SECTION_KEYS.has(k)) setHeader(out, k, v);
  };
  add(headers.common);
  add(headers[method]);
  add(headers);
  for (const k of Object.keys(out)) {
    if (out[k] === null || out[k] === undefined || out[k] === false) delete out[k];
    else out[k] = String(out[k]);
  }
  return out;
}

/** Turns fetch Headers into a plain object with lower-case keys; this is response.headers. */
export const parseHeaders = (h) => {
  const out = {};
  h.forEach((v, k) => (out[k] = v));
  return out;
};

export const mergeHeaders = (a, b) => {
  const out = {};
  // Copy sections too, so an instance made with create() never changes its parent's defaults.
  for (const [k, v] of Object.entries(toObject(a))) out[k] = SECTION_KEYS.has(k) && isPlainObject(v) ? { ...v } : v;
  for (const [k, v] of Object.entries(toObject(b))) {
    if (SECTION_KEYS.has(k) && isPlainObject(v)) out[k] = { ...(isPlainObject(out[k]) ? out[k] : {}), ...v };
    else setHeader(out, k, v);
  }
  return out;
};
