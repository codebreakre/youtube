// @vidora/http: a small HTTP client with the same API as axios, built on fetch.
//
//   import http from '@vidora/http';
//   const { data } = await http.get('/api/videos', { params: { q: 'bunny' } });
//   const api = http.create({ baseURL: '/api', timeout: 10000 });
//   api.interceptors.request.use((config) => { config.headers['X-Token'] = '...'; return config; });
import { Http } from './Http.js';
import { defaults, toFormData } from './defaults.js';
import { mergeConfig } from './mergeConfig.js';
import { HttpError, CanceledError, CancelToken, isCancel, isHttpError } from './errors.js';

const INSTANCE_METHODS = ['request', 'getUri', 'get', 'delete', 'head', 'options', 'post', 'put', 'patch', 'postForm', 'putForm', 'patchForm'];

/** An instance can be called directly, as http(config) or http(url, config), and has every method. */
function createInstance(instanceConfig) {
  const context = new Http(instanceConfig);
  const instance = (...args) => context.request(...args);
  for (const m of INSTANCE_METHODS) instance[m] = context[m].bind(context);
  instance.defaults = context.defaults;
  instance.interceptors = context.interceptors;
  instance.create = (config) => createInstance(mergeConfig(instance.defaults, config));
  return instance;
}

const http = createInstance(defaults);

Object.assign(http, {
  Http,
  HttpError,
  CanceledError,
  CancelToken,
  isCancel,
  isHttpError,
  toFormData,
  mergeConfig,
  VERSION: '1.0.0',
  all: (promises) => Promise.all(promises),
  spread: (callback) => (arr) => callback(...arr),
});

export default http;
export { Http, HttpError, CanceledError, CancelToken, isCancel, isHttpError, toFormData, mergeConfig };
