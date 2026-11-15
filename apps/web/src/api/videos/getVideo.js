import { client } from '../client.js';

/** GET /api/videos/:id → video */
export async function getVideo(videoId) {
  const { data } = await client.get(`/videos/${encodeURIComponent(videoId)}`);
  return data;
}
