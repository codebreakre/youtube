import { client } from '../client.js';

/** PUT /api/videos/:id/thumbnail with a JPEG blob. The server ignores it if a thumbnail already exists. */
export async function uploadThumbnail(videoId, jpegBlob) {
  await client.put(`/videos/${encodeURIComponent(videoId)}/thumbnail`, jpegBlob, {
    headers: { 'Content-Type': 'image/jpeg' },
  });
}
