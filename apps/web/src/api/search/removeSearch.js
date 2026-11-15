import { client } from '../client.js';

/** DELETE /api/me/searches?q removes one entry from the user's past searches. */
export async function removeSearch(q) {
  await client.delete('/me/searches', { params: { q } });
}
