import { client } from '../client.js';

/** GET /api/me → { lists, progress } */
export async function getMe() {
  const { data } = await client.get('/me');
  return data;
}
