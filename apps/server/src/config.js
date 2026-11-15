import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = path.resolve(here, '..');
export const ROOT = path.resolve(SERVER_DIR, '../..');
export const WEB_DIR = path.join(ROOT, 'apps', 'web');
export const MINI_DIR = path.join(ROOT, 'packages', 'mini', 'src');
export const HTTP_DIR = path.join(ROOT, 'packages', 'http', 'src');
export const DATA_DIR = path.join(SERVER_DIR, 'data');
export const MEDIA_DIR = path.join(SERVER_DIR, 'media');
export const VIDEOS_DIR = path.join(MEDIA_DIR, 'videos');
export const THUMBS_DIR = path.join(MEDIA_DIR, 'thumbs');

export const PORT = Number(process.env.PORT) || 3000;
export const HOST = process.env.HOST || '127.0.0.1';

/** Max bytes returned for an open-ended Range request ("bytes=N-"). Forces chunked streaming. */
export const STREAM_CHUNK = 2 * 1024 * 1024;
