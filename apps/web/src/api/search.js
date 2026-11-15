// Search + autocomplete: /api/search, /api/suggest, /api/me/searches
import { request, seg } from './client.js';

export const searchApi = {
  /** GET /search?q → { results }. Also stores the query in the user's search history. */
  search: (q) => request(`/search?q=${seg(q)}`),

  /** GET /suggest?q → { suggestions: [{ text, kind }] }. Pass an AbortSignal to cancel stale lookups. */
  suggest: (q, signal) => request(`/suggest?q=${seg(q)}`, { signal }),

  /** DELETE /me/searches?q — remove one entry from the user's past searches. */
  forget: (q) => request(`/me/searches?q=${seg(q)}`, { method: 'DELETE' }),
};
