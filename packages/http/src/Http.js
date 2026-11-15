import { InterceptorManager } from './InterceptorManager.js';
import { mergeConfig } from './mergeConfig.js';
import { flattenHeaders, METHODS_WITH_BODY, METHODS_WITHOUT_BODY } from './headers.js';
import { buildFullPath, buildURL } from './buildURL.js';
import { HttpError, CanceledError, isCancel } from './errors.js';

const toArray = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);

function throwIfCanceled(config) {
  config.cancelToken?.throwIfRequested();
  if (config.signal?.aborted) throw new CanceledError(null, config);
}

function transform(fns, config, data, ...args) {
  for (const fn of toArray(fns)) data = fn.call(config, data, ...args);
  return data;
}

/** Runs after the request interceptors and before the response interceptors. */
async function dispatchRequest(config) {
  throwIfCanceled(config);

  const headers = flattenHeaders(config.headers, config.method);
  if (config.auth) {
    const { username = '', password = '' } = config.auth;
    const bytes = new TextEncoder().encode(`${username}:${password}`);
    headers.Authorization = 'Basic ' + btoa(String.fromCharCode(...bytes));
  }
  const data = transform(config.transformRequest, config, config.data, headers);
  const url = buildURL(buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls), config.params, config.paramsSerializer);

  const adapter = config.adapter;
  if (typeof adapter !== 'function') throw new HttpError('adapter is not a function', HttpError.ERR_BAD_OPTION_VALUE, config);

  let response;
  try {
    response = await adapter({ ...config, url, headers, data });
    throwIfCanceled(config);
  } catch (err) {
    if (!isCancel(err) && err.response) {
      err.response.data = transform(config.transformResponse, config, err.response.data, err.response.headers, err.response.status);
    }
    throw err;
  }
  response.config = config;
  response.data = transform(config.transformResponse, config, response.data, response.headers, response.status);

  const { validateStatus } = config;
  if (!response.status || !validateStatus || validateStatus(response.status)) return response;
  throw new HttpError(
    `Request failed with status code ${response.status}`,
    response.status >= 500 ? HttpError.ERR_BAD_RESPONSE : HttpError.ERR_BAD_REQUEST,
    config,
    response.request,
    response,
  );
}

export class Http {
  constructor(instanceConfig = {}) {
    this.defaults = instanceConfig;
    this.interceptors = { request: new InterceptorManager(), response: new InterceptorManager() };
  }

  /** request(config) or request(url, config) */
  request(configOrUrl, config) {
    config = typeof configOrUrl === 'string' ? { ...config, url: configOrUrl } : configOrUrl || {};
    config = mergeConfig(this.defaults, config);
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // Same order as axios: request interceptors run newest first, response interceptors oldest first.
    const requestChain = [];
    this.interceptors.request.forEach(({ fulfilled, rejected, runWhen }) => {
      const run = fulfilled && runWhen ? (c) => (runWhen(c) === false ? c : fulfilled(c)) : fulfilled;
      requestChain.unshift([run, rejected]);
    });
    const responseChain = [];
    this.interceptors.response.forEach(({ fulfilled, rejected }) => responseChain.push([fulfilled, rejected]));

    let promise = Promise.resolve(config);
    for (const [f, r] of requestChain) promise = promise.then(f, r);
    promise = promise.then(dispatchRequest);
    for (const [f, r] of responseChain) promise = promise.then(f, r);
    return promise;
  }

  getUri(config = {}) {
    const merged = mergeConfig(this.defaults, config);
    return buildURL(buildFullPath(merged.baseURL, config.url, merged.allowAbsoluteUrls), merged.params, merged.paramsSerializer);
  }
}

for (const method of METHODS_WITHOUT_BODY) {
  Http.prototype[method] = function (url, config) {
    return this.request({ ...config, method, url, data: config?.data });
  };
}
for (const method of METHODS_WITH_BODY) {
  Http.prototype[method] = function (url, data, config) {
    return this.request({ ...config, method, url, data });
  };
  // postForm, putForm, patchForm: send the data as multipart/form-data
  Http.prototype[method + 'Form'] = function (url, data, config) {
    return this.request({ ...config, method, url, data, headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' } });
  };
}
