import { client } from '../client.js';

/** POST /api/me/history records that playback of a video has started. */
export async function addToHistory(videoId) {
  await client.post('/me/history', { videoId });
}
