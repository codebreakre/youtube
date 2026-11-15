import { client } from '../client.js';

/** DELETE /api/me/history clears the whole history. */
export async function clearHistory() {
  await client.delete('/me/history');
}
