import { client } from '../client.js';

/** DELETE /api/me/history/:id */
export async function removeFromHistory(videoId) {
  await client.delete(`/me/history/${encodeURIComponent(videoId)}`);
}
