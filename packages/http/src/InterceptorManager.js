export class InterceptorManager {
  handlers = [];

  /**
   * Adds an interceptor and returns an id for eject().
   * For request interceptors, options.runWhen(config) returning false skips it for that request.
   */
  use(fulfilled, rejected, options = {}) {
    this.handlers.push({ fulfilled, rejected, runWhen: options.runWhen || null });
    return this.handlers.length - 1;
  }

  eject(id) {
    if (this.handlers[id]) this.handlers[id] = null;
  }

  clear() {
    this.handlers = [];
  }

  forEach(fn) {
    for (const h of this.handlers) if (h) fn(h);
  }
}
