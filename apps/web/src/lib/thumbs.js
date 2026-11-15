import { videosApi } from '../api/index.js';

const done = new Set();

/**
 * Grab the current frame of a (same-origin) <video> and upload it as the video's thumbnail.
 * The server ignores it if a thumbnail already exists.
 */
export async function captureThumbnail(videoEl, id) {
  if (done.has(id) || !videoEl.videoWidth) return;
  done.add(id);
  try {
    const w = 640;
    const h = Math.round((w * videoEl.videoHeight) / videoEl.videoWidth) || 360;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(videoEl, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) return;
    await videosApi.uploadThumbnail(id, blob);
  } catch (e) {
    console.warn('thumbnail upload failed', e);
  }
}
