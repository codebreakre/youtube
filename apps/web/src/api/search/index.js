// Search and autocomplete requests, one file each.
import { searchVideos } from './searchVideos.js';
import { getSuggestions } from './getSuggestions.js';
import { removeSearch } from './removeSearch.js';

export const searchApi = {
  search: searchVideos,
  suggest: getSuggestions,
  forget: removeSearch,
};
