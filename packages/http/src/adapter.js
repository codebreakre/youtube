// The only file that touches the network: sends the final config with fetch() and returns a response.
import { HttpError, CanceledError } from './errors.js';
import { parseHeaders } from './headers.js';

async function readBody(res, responseType) {
  switch (responseType) {
    case 'arraybuffer': return res.arrayBuffer();
    case 'blob': return res.blob();
    case 'formdata': return res.formData();
    case 'stream': return res.body;
    default: return res.text(); // for 'json' and 'text'; transformResponse parses the JSON
  }
}

export async function fetchAdapter(config) {
  const { url, method, data, headers, timeout, signal, cancelToken, responseType, withCredentials, fetchOptions } = config;
  const request = { url, method };

  const controller = new AbortController();
  let reason = null; // 'timeout' or a CanceledError
  const abort = (why) => {
    if (reason) return;
    reason = why;
    controller.abort();
  };

  const onSignal = () => abort(new CanceledError(null, config, request));
  if (signal) {
    if (signal.aborted) throw new CanceledError(null, config, request);
    signal.addEventListener('abort', onSignal, { once: true });
  }
  const onToken = (r) => abort(r);
  cancelToken?.subscribe(onToken);
  const timer = timeout > 0 ? setTimeout(() => abort('timeout'), timeout) : null;

  try {
    const res = await fetch(url, {
      credentials: withCredentials ? 'include' : 'same-origin',
      ...fetchOptions,
      method: method.toUpperCase(),
      headers,
      body: data === undefined || data === null || method === 'get' || method === 'head' ? undefined : data,
      signal: controller.signal,
    });
    const body = method === 'head' ? '' : await readBody(res, responseType);
    return { data: body, status: res.status, statusText: res.statusText, headers: parseHeaders(res.headers), config, request };
  } catch (err) {
    if (reason === 'timeout') {
      const msg = config.timeoutErrorMessage || `timeout of ${timeout}ms exceeded`;
      throw new HttpError(msg, config.transitional?.clarifyTimeoutError ? HttpError.ETIMEDOUT : HttpError.ECONNABORTED, config, request);
    }
    if (reason) throw reason;
    if (err instanceof HttpError) throw err;
    throw HttpError.from({ message: err.message || 'Network Error' }, HttpError.ERR_NETWORK, config, request);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onSignal);
    cancelToken?.unsubscribe(onToken);
  }
}
