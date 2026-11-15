// The configured HTTP client shared by every API module in this folder.
// It uses @vidora/http (packages/http), our axios-style library. The syntax is the same as axios.
// Pages and components import from '../api/index.js', never from here.
import http from '@vidora/http';

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

export const client = http.create({
  baseURL: '/api',
  timeout: 15000,
});

// Every request carries the anonymous user id.
client.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = uid;
  return config;
});

// Use the server's { error: "..." } message, so pages can show e.message as is.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage = error.response?.data?.error;
    if (serverMessage) error.message = serverMessage;
    return Promise.reject(error);
  },
);

export const isCancel = http.isCancel;
export const isHttpError = http.isHttpError;
