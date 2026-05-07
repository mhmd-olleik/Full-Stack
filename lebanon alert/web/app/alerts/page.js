'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { api, REGIONS, CATEGORIES, SEVERITIES, SEVERITY_EMOJI, CATEGORY_EMOJI } from '@/lib/constants';

export default function AlertsPage() {
  const { t, lang } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ region: '', severity: '', category: '', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (filters.region) params.region = filters.region;
    if (filters.severity) params.severity = filters.severity;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    try {
      const res = await api.get('/api/alerts', params);
      if (res.success) { setAlerts(res.data); setPagination(res.pagination); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filters.region, filters.severity, filters.category]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>📋 {t.alerts}</h1>
        <p>Browse and filter all verified emergency alerts</p>
      </div>

      <form onSubmit={handleSearch} className="filters-bar">
        <select className="filter-select" value={filters.region} onChange={e => { setFilters(f => ({ ...f, region: e.target.value })); setPage(1); }}>
          <option value="">{t.allRegions}</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="filter-select" value={filters.severity} onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}>
          <option value="">{t.allSeverities}</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{SEVERITY_EMOJI[s]} {s}</option>)}
        </select>
        <select className="filter-select" value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}>
          <option value="">{t.allCategories}</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
        </select>
        <input className="filter-input" type="text" placeholder={t.search} value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <button type="submit" className="btn btn-primary btn-sm">🔍</button>
      </form>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><p>{t.loading}</p></div>
      ) : alerts.length === 0 ? (
        <div className="empty-state"><div className="emoji">📡</div><p>{t.noAlerts}</p></div>
      ) : (
        <>
          <div className="timeline">
            {alerts.map((alert, i) => {
              const title = alert.title?.[lang] || alert.title?.en || 'Alert';
              const desc = alert.description?.[lang] || alert.description?.en || '';
              const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={alert._id || i} className="timeline-item">
                  <div className={`timeline-dot ${alert.severity}`}></div>
                  <div className={`alert-card severity-${alert.severity}`}>
                    <span className="alert-icon">{CATEGORY_EMOJI[alert.category] || '⚡'}</span>
                    <div className="alert-content">
                      <div className="alert-title">{title}</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0' }}>{desc.substring(0, 200)}</p>
                      <div className="alert-meta">
                        <span className={`severity-badge ${alert.severity}`}>{SEVERITY_EMOJI[alert.severity]} {alert.severity}</span>
                        <span>📍 {alert.region}</span>
                        <span>🏷️ {alert.category}</span>
                        <span>🕐 {time}</span>
                        <span>📡 {alert.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '2rem 0' }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ padding: '6px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Page {page} of {pagination.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
