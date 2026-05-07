'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api, translations } from '@/lib/constants';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AppProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);

  const t = translations[lang] || translations.en;
  const isRTL = lang === 'ar';

  // Load saved auth
  useEffect(() => {
    const saved = localStorage.getItem('lebalert_auth');
    if (saved) {
      try {
        const { user: u, token: tk } = JSON.parse(saved);
        setUser(u); setToken(tk);
      } catch {}
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const s = io(API_URL, { transports: ['websocket', 'polling'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('new-alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 99)]);
    });
    s.on('alert-updated', (alert) => {
      setAlerts(prev => prev.map(a => a._id === alert._id ? alert : a));
    });
    s.on('alert-deleted', ({ id }) => {
      setAlerts(prev => prev.filter(a => a._id !== id));
    });
    s.on('alert-stats', (data) => setStats(data));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // Fetch initial data
  const fetchAlerts = useCallback(async (params = {}) => {
    try {
      const res = await api.get('/api/alerts', { limit: 50, ...params });
      if (res.success) setAlerts(res.data);
      return res;
    } catch { return { success: false, data: [] }; }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/alerts/stats');
      if (res.success) setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); fetchStats(); }, [fetchAlerts, fetchStats]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.success) {
      setUser(res.data); setToken(res.data.token);
      localStorage.setItem('lebalert_auth', JSON.stringify({ user: res.data, token: res.data.token }));
    }
    return res;
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('lebalert_auth');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  return (
    <AppContext.Provider value={{
      lang, t, isRTL, toggleLang,
      user, token, login, logout,
      socket, connected,
      alerts, setAlerts, fetchAlerts,
      stats, fetchStats,
      API_URL
    }}>
      {children}
    </AppContext.Provider>
  );
}
