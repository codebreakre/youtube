import { client } from '../client.js';

/** POST /api/videos/:id/view → { views } */
export async function addView(videoId) {
  const { data } = await client.post(`/videos/${encodeURIComponent(videoId)}/view`);
  return data;
}
