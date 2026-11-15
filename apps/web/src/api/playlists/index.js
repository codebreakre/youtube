// Watch later / Liked videos requests, one file each.
import { getPlaylist } from './getPlaylist.js';
import { addToPlaylist } from './addToPlaylist.js';
import { removeFromPlaylist } from './removeFromPlaylist.js';

export const playlistsApi = {
  get: getPlaylist,
  add: addToPlaylist,
  remove: removeFromPlaylist,
};
