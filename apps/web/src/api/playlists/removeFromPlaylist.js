import { client } from '../client.js';

/** DELETE /api/me/playlists/:list/:videoId */
export async function removeFromPlaylist(list, videoId) {
  await client.delete(`/me/playlists/${encodeURIComponent(list)}/${encodeURIComponent(videoId)}`);
}
