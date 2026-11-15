import { client } from '../client.js';

/** GET /api/videos → { videos, categories } */
export async function getVideos() {
  const { data } = await client.get('/videos');
  return data;
}
