import { client } from '../client.js';

/** GET /api/videos/:id/related → video[] */
export async function getRelatedVideos(videoId) {
  const { data } = await client.get(`/videos/${encodeURIComponent(videoId)}/related`);
  return data;
}
