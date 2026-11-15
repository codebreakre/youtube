// Watch history requests, one file each.
import { getHistory } from './getHistory.js';
import { addToHistory } from './addToHistory.js';
import { saveProgress } from './saveProgress.js';
import { removeFromHistory } from './removeFromHistory.js';
import { clearHistory } from './clearHistory.js';

export const historyApi = {
  list: getHistory,
  add: addToHistory,
  saveProgress,
  remove: removeFromHistory,
  clear: clearHistory,
};
