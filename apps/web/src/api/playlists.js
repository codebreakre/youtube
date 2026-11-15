// Built-in playlists (WL = Watch later, LL = Liked videos): /api/me/playlists/:list
import { request, seg } from './client.js';

export const playlistsApi = {
  /** GET /me/playlists/:list → { id, title, items: [{ video, addedAt }] } */
  get: (list) => request(`/me/playlists/${seg(list)}`),

  /** POST /me/playlists/:list */
  add: (list, videoId) => request(`/me/playlists/${seg(list)}`, { method: 'POST', body: { videoId } }),

  /** DELETE /me/playlists/:list/:videoId */
  remove: (list, videoId) => request(`/me/playlists/${seg(list)}/${seg(videoId)}`, { method: 'DELETE' }),
};
