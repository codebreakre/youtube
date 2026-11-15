import { client } from '../client.js';

/** GET /api/me/playlists/:list → { id, title, items: [{ video, addedAt }] }. list is 'WL' or 'LL'. */
export async function getPlaylist(list) {
  const { data } = await client.get(`/me/playlists/${encodeURIComponent(list)}`);
  return data;
}
