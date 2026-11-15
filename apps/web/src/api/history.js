// Watch history: /api/me/history
import { request, seg } from './client.js';

export const historyApi = {
  /** GET /me/history → [{ video, watchedAt, position, ... }] */
  list: () => request('/me/history'),

  /** POST /me/history — record that playback of a video started. */
  add: (videoId) => request('/me/history', { method: 'POST', body: { videoId } }),

  /** PUT /me/history/:id — save resume position. Uses keepalive so it survives page unload. */
  saveProgress: (videoId, position, duration) =>
    request(`/me/history/${seg(videoId)}`, { method: 'PUT', body: { position, duration }, keepalive: true }),

  /** DELETE /me/history/:id */
  remove: (videoId) => request(`/me/history/${seg(videoId)}`, { method: 'DELETE' }),

  /** DELETE /me/history — clear everything. */
  clear: () => request('/me/history', { method: 'DELETE' }),
};
