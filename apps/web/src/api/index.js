// Every backend call the web app makes lives in this folder, grouped by resource.
//
//   videos.js     catalog, related videos, views, thumbnails
//   search.js     search results, autocomplete suggestions, past searches
//   user.js       the current user (lists + resume progress)
//   history.js    watch history and resume positions
//   playlists.js  Watch later / Liked videos
//   client.js     shared fetch wrapper (X-User-Id header, JSON, errors)
export { ApiError } from './client.js';
export { videosApi } from './videos.js';
export { searchApi } from './search.js';
export { userApi } from './user.js';
export { historyApi } from './history.js';
export { playlistsApi } from './playlists.js';
