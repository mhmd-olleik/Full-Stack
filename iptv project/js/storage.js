// ============================================
// Storage Manager — Local Storage Utilities
// ============================================

const Storage = {
  // Keys
  KEYS: {
    WATCHLIST: 'iptv_watchlist',
    HISTORY: 'iptv_history',
    PREFERENCES: 'iptv_preferences',
    LAST_WATCHED: 'iptv_last_watched',
  },

  // ---- Generic Helpers ----
  get(key, fallback = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage full or unavailable:', e);
    }
  },

  // ---- Watchlist ----
  getWatchlist() {
    return this.get(this.KEYS.WATCHLIST, []);
  },

  addToWatchlist(item) {
    const list = this.getWatchlist();
    const exists = list.find(i => i.id === item.id && i.type === item.type);
    if (!exists) {
      list.unshift({
        id: item.id,
        type: item.type, // 'movie' or 'tv'
        title: item.title || item.name,
        poster: item.poster_path,
        rating: item.vote_average,
        year: (item.release_date || item.first_air_date || '').split('-')[0],
        addedAt: Date.now()
      });
      this.set(this.KEYS.WATCHLIST, list);
      return true;
    }
    return false;
  },

  removeFromWatchlist(id, type) {
    const list = this.getWatchlist().filter(i => !(i.id === id && i.type === type));
    this.set(this.KEYS.WATCHLIST, list);
  },

  isInWatchlist(id, type) {
    return this.getWatchlist().some(i => i.id === id && i.type === type);
  },

  toggleWatchlist(item) {
    const type = item.media_type || item.type || 'movie';
    if (this.isInWatchlist(item.id, type)) {
      this.removeFromWatchlist(item.id, type);
      return false;
    } else {
      this.addToWatchlist({ ...item, type });
      return true;
    }
  },

  // ---- Watch History ----
  getHistory() {
    return this.get(this.KEYS.HISTORY, []);
  },

  addToHistory(item) {
    let history = this.getHistory();
    // Remove existing entry
    history = history.filter(i => !(i.id === item.id && i.type === item.type));
    history.unshift({
      id: item.id,
      type: item.type,
      title: item.title || item.name,
      poster: item.poster_path,
      watchedAt: Date.now(),
      season: item.season || null,
      episode: item.episode || null,
    });
    // Keep only last 50
    if (history.length > 50) history = history.slice(0, 50);
    this.set(this.KEYS.HISTORY, history);
  },

  clearHistory() {
    this.set(this.KEYS.HISTORY, []);
  },

  // ---- User Preferences ----
  getPreferences() {
    return this.get(this.KEYS.PREFERENCES, {
      preferredServer: 0,
      preferredQuality: 'auto',
      autoplay: true,
      theme: 'dark',
    });
  },

  setPreference(key, value) {
    const prefs = this.getPreferences();
    prefs[key] = value;
    this.set(this.KEYS.PREFERENCES, prefs);
  },

  // ---- Last Watched Position ----
  savePosition(contentId, position) {
    const positions = this.get(this.KEYS.LAST_WATCHED, {});
    positions[contentId] = {
      position,
      updatedAt: Date.now()
    };
    this.set(this.KEYS.LAST_WATCHED, positions);
  },

  getPosition(contentId) {
    const positions = this.get(this.KEYS.LAST_WATCHED, {});
    return positions[contentId]?.position || 0;
  },
};

// Make available globally
window.Storage = Storage;
