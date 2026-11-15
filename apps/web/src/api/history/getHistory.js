import { client } from '../client.js';

/** GET /api/me/history → [{ video, watchedAt, position, ... }] */
export async function getHistory() {
  const { data } = await client.get('/me/history');
  return data;
}
