import { getHeader, setHeader, deleteHeader } from './headers.js';
import { isPlainObject, isRawBody, isFormData, isURLSearchParams, isBlob } from './utils.js';
import { fetchAdapter } from './adapter.js';

const CONTENT_TYPE = 'Content-Type';

/** { a: 1, file: blob } → FormData. Used by postForm and by a multipart Content-Type. */
export function toFormData(obj, form = new FormData()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    for (const item of Array.isArray(v) ? v : [v]) {
      form.append(Array.isArray(v) ? `${k}[]` : k, isBlob(item) ? item : isPlainObject(item) ? JSON.stringify(item) : String(item));
    }
  }
  return form;
}

function transformRequestDefault(data, headers) {
  const type = String(getHeader(headers, CONTENT_TYPE) || '').toLowerCase();

  if (isPlainObject(data) && type.includes('multipart/form-data')) data = toFormData(data);
  if (isFormData(data)) {
    deleteHeader(headers, CONTENT_TYPE); // fetch adds the multipart boundary itself
    return data;
  }
  if (isURLSearchParams(data)) {
    if (!type) setHeader(headers, CONTENT_TYPE, 'application/x-www-form-urlencoded;charset=utf-8');
    return data.toString();
  }
  if (isBlob(data)) {
    if (!type && data.type) setHeader(headers, CONTENT_TYPE, data.type);
    return data;
  }
  if (isRawBody(data)) return data;

  if (data !== undefined && data !== null && typeof data === 'object') {
    if (type.includes('application/x-www-form-urlencoded')) return new URLSearchParams(data).toString();
    if (!type) setHeader(headers, CONTENT_TYPE, 'application/json');
    return JSON.stringify(data);
  }
  return data;
}

function transformResponseDefault(data) {
  const type = this.responseType;
  if (typeof data === 'string' && data && (!type || type === 'json')) {
    try {
      return JSON.parse(data);
    } catch {
      // Not JSON: return the text as is, like axios does by default.
    }
  }
  return data;
}

export const defaults = {
  adapter: fetchAdapter,
  transformRequest: [transformRequestDefault],
  transformResponse: [transformResponseDefault],
  timeout: 0,
  responseType: 'json',
  withCredentials: false,
  validateStatus: (status) => status >= 200 && status < 300,
  headers: {
    common: { Accept: 'application/json, text/plain, */*' },
    get: {},
    delete: {},
    head: {},
    options: {},
    post: {},
    put: {},
    patch: {},
  },
};
