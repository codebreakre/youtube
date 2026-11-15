// Current (anonymous) user: /api/me
import { request } from './client.js';

export const userApi = {
  /** GET /me → { lists, progress } */
  me: () => request('/me'),
};
