// Video catalog: /api/videos/*
import { request, seg } from './client.js';

export const videosApi = {
  /** GET /videos → { videos, categories } */
  list: () => request('/videos'),

  /** GET /videos/:id → video */
  get: (id) => request(`/videos/${seg(id)}`),

  /** GET /videos/:id/related → video[] */
  related: (id) => request(`/videos/${seg(id)}/related`),

  /** POST /videos/:id/view → { views } */
  addView: (id) => request(`/videos/${seg(id)}/view`, { method: 'POST' }),

  /** PUT /videos/:id/thumbnail (JPEG blob). Ignored by the server if one already exists. */
  uploadThumbnail: (id, jpegBlob) => request(`/videos/${seg(id)}/thumbnail`, { method: 'PUT', body: jpegBlob }),
};
