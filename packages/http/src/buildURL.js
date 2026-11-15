import { isPlainObject, isURLSearchParams } from './utils.js';

// Like axios, leave a few characters unescaped in query strings.
const encode = (v) =>
  encodeURIComponent(v)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');

/** { a: 1, tags: ['x', 'y'], skip: null } → "a=1&tags[]=x&tags[]=y" */
export function serializeParams(params) {
  if (isURLSearchParams(params)) return params.toString();
  const parts = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined) continue;
    const isArr = Array.isArray(val);
    for (let v of isArr ? val : [val]) {
      if (v === null || v === undefined) continue;
      if (v instanceof Date) v = v.toISOString();
      else if (isPlainObject(v) || Array.isArray(v)) v = JSON.stringify(v);
      parts.push(`${encode(isArr ? key + '[]' : key)}=${encode(v)}`);
    }
  }
  return parts.join('&');
}

export function buildURL(url, params, paramsSerializer) {
  if (!params) return url;
  const serialize = typeof paramsSerializer === 'function' ? paramsSerializer : paramsSerializer?.serialize || serializeParams;
  const query = serialize(params);
  if (!query) return url;
  const hash = url.indexOf('#');
  if (hash !== -1) url = url.slice(0, hash);
  return url + (url.includes('?') ? '&' : '?') + query;
}

export const isAbsoluteURL = (url) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);

export const combineURLs = (base, rel) => (rel ? base.replace(/\/?\/$/, '') + '/' + rel.replace(/^\/+/, '') : base);

export const buildFullPath = (baseURL, url = '', allowAbsoluteUrls = true) =>
  baseURL && !(allowAbsoluteUrls && isAbsoluteURL(url)) ? combineURLs(baseURL, url) : url;
