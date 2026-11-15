import { client } from '../client.js';

/** POST /api/me/playlists/:list adds a video. list is 'WL' (Watch later) or 'LL' (Liked videos). */
export async function addToPlaylist(list, videoId) {
  await client.post(`/me/playlists/${encodeURIComponent(list)}`, { videoId });
}
