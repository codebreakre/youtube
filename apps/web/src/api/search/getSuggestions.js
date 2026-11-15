import { client } from '../client.js';

/** GET /api/suggest?q → { suggestions: [{ text, kind }] }. Pass an AbortSignal to cancel out-of-date lookups. */
export async function getSuggestions(q, signal) {
  const { data } = await client.get('/suggest', { params: { q }, signal });
  return data;
}
