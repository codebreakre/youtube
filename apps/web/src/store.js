import { createStore } from 'mini';
import { userApi, playlistsApi } from './api/index.js';
import { router } from './router.js';

const ls = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

export const LIST_NAMES = { WL: 'Watch later', LL: 'Liked videos' };

/** Global UI + user state. */
export const app = createStore({
  theme: document.documentElement.dataset.theme || 'light',
  guideCollapsed: ls.get('guideCollapsed', false),
  drawer: false,
  theater: ls.get('theater', false),
  autoplay: ls.get('autoplay', true),
  volume: ls.get('volume', 1),
  muted: ls.get('muted', false),
  lists: { WL: [], LL: [] }, // video ids
  progress: {}, // videoId → 0..1 watched
  toast: null,
});

export const actions = {
  async loadMe() {
    try {
      const me = await userApi.me();
      app.set({ lists: me.lists, progress: me.progress });
    } catch (e) {
      console.warn('Could not load user state', e);
    }
  },

  inList(list, id) {
    return app.get().lists[list]?.includes(id) ?? false;
  },

  async toggleList(list, video) {
    const has = actions.inList(list, video.id);
    const setIds = (fn) => app.set((s) => ({ lists: { ...s.lists, [list]: fn(s.lists[list] || []) } }));
    setIds((ids) => (has ? ids.filter((x) => x !== video.id) : list === 'WL' ? [...ids, video.id] : [video.id, ...ids]));
    try {
      if (has) await playlistsApi.remove(list, video.id);
      else await playlistsApi.add(list, video.id);
      if (list === 'WL') {
        actions.toast(has ? 'Removed from Watch later' : 'Saved to Watch later', {
          label: 'Undo',
          run: () => actions.toggleList(list, video),
        });
      } else if (!has) {
        actions.toast('Added to Liked videos');
      }
    } catch {
      setIds((ids) => (has ? [...ids, video.id] : ids.filter((x) => x !== video.id)));
      actions.toast('Something went wrong. Please try again.');
    }
  },

  setProgress(videoId, fraction) {
    app.set((s) => ({ progress: { ...s.progress, [videoId]: fraction } }));
  },

  forgetProgress(videoId) {
    app.set((s) => {
      const progress = { ...s.progress };
      delete progress[videoId];
      return { progress };
    });
  },

  toast(message, action = null) {
    app.set({ toast: { id: Date.now() + Math.random(), message, action } });
  },

  toggleTheme() {
    const theme = app.get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    ls.set('theme', theme);
    app.set({ theme });
  },

  toggleGuide() {
    const watch = router.store.get().route?.name === 'watch';
    if (watch || !matchMedia('(min-width: 1312px)').matches) {
      app.set((s) => ({ drawer: !s.drawer }));
    } else {
      const guideCollapsed = !app.get().guideCollapsed;
      ls.set('guideCollapsed', guideCollapsed);
      app.set({ guideCollapsed });
    }
  },

  closeDrawer() {
    if (app.get().drawer) app.set({ drawer: false });
  },

  toggleTheater() {
    const theater = !app.get().theater;
    ls.set('theater', theater);
    app.set({ theater });
  },

  setAutoplay(autoplay) {
    ls.set('autoplay', autoplay);
    app.set({ autoplay });
  },

  setVolume(volume, muted) {
    ls.set('volume', volume);
    ls.set('muted', muted);
    app.set({ volume, muted });
  },
};
