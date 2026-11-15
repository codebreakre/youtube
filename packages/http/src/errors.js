export class HttpError extends Error {
  static ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
  static ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
  static ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
  static ERR_NETWORK = 'ERR_NETWORK';
  static ERR_CANCELED = 'ERR_CANCELED';
  static ECONNABORTED = 'ECONNABORTED';
  static ETIMEDOUT = 'ETIMEDOUT';

  /**
   * @param {string} message
   * @param {string} [code]     one of the static codes above
   * @param {object} [config]   the request config
   * @param {object} [request]  { url, method }
   * @param {object} [response] { data, status, statusText, headers, config, request }
   */
  constructor(message, code, config, request, response) {
    super(message);
    this.name = 'HttpError';
    this.isHttpError = true;
    this.code = code;
    this.config = config;
    this.request = request;
    this.response = response;
    this.status = response?.status;
  }

  static from(error, code, config, request, response) {
    const e = new HttpError(error.message, code, config, request, response);
    e.cause = error;
    return e;
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code, status: this.status, method: this.config?.method, url: this.config?.url };
  }
}

export class CanceledError extends HttpError {
  constructor(message, config, request) {
    super(message ?? 'canceled', HttpError.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

export const isCancel = (v) => !!v?.__CANCEL__;
export const isHttpError = (v) => v?.isHttpError === true;

/** Older axios-style cancellation. Prefer `signal: abortController.signal`. */
export class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') throw new TypeError('executor must be a function.');
    this._listeners = [];
    this.promise = new Promise((resolve) => (this._resolve = resolve));
    executor((message, config, request) => {
      if (this.reason) return;
      this.reason = new CanceledError(message, config, request);
      this._resolve(this.reason);
      for (const fn of this._listeners.splice(0)) fn(this.reason);
    });
  }
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  subscribe(fn) {
    if (this.reason) fn(this.reason);
    else this._listeners.push(fn);
  }
  unsubscribe(fn) {
    const i = this._listeners.indexOf(fn);
    if (i !== -1) this._listeners.splice(i, 1);
  }
  static source() {
    let cancel;
    const token = new CancelToken((c) => (cancel = c));
    return { token, cancel };
  }
}
