import { client } from '../client.js';

/** PUT /api/me/history/:id saves the resume position. keepalive lets it finish even if the page is closing. */
export async function saveProgress(videoId, position, duration) {
  await client.put(
    `/me/history/${encodeURIComponent(videoId)}`,
    { position, duration },
    { fetchOptions: { keepalive: true } },
  );
}
