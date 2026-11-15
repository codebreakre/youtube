import { client } from '../client.js';

/** GET /api/search?q → { results }. Also saves the query in the user's search history. */
export async function searchVideos(q) {
  const { data } = await client.get('/search', { params: { q } });
  return data;
}
