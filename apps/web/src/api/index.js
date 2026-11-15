// Every backend call the web app makes is in this folder: one file = one request.
//
//   client.js                    the configured @vidora/http instance (baseURL, user id, error messages)
//   videos/     getVideos, getVideo, getRelatedVideos, addView, uploadThumbnail
//   search/     searchVideos, getSuggestions, removeSearch
//   user/       getMe
//   history/    getHistory, addToHistory, saveProgress, removeFromHistory, clearHistory
//   playlists/  getPlaylist, addToPlaylist, removeFromPlaylist
//
// Each folder's index.js groups its requests into one object (videosApi, searchApi, ...).
export { client, isCancel, isHttpError } from './client.js';
export { videosApi } from './videos/index.js';
export { searchApi } from './search/index.js';
export { userApi } from './user/index.js';
export { historyApi } from './history/index.js';
export { playlistsApi } from './playlists/index.js';
