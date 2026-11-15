import { createRouter } from 'mini';

// YouTube-style URLs.
export const router = createRouter([
  { name: 'home', path: '/', component: 'page-home' },
  { name: 'results', path: '/results', component: 'page-results' },
  { name: 'watch', path: '/watch', component: 'page-watch' },
  { name: 'history', path: '/feed/history', component: 'page-history' },
  { name: 'playlist', path: '/playlist', component: 'page-playlist' },
]);
