'use client';
import { useApp } from '@/lib/AppContext';
import { SEVERITY_COLORS, CATEGORY_EMOJI, SEVERITY_EMOJI } from '@/lib/constants';
import dynamic from 'next/dynamic';

const AlertMap = dynamic(() => import('@/components/AlertMap'), { ssr: false, loading: () => <div className="map-container"><div className="loading-screen"><div className="spinner"></div></div></div> });

function StatsCards() {
  const { stats, t } = useApp();
  if (!stats) return null;
  return (
    <div className="stats-grid">
      <div className="stat-card critical">
        <div className="stat-label">{t.totalAlerts}</div>
        <div className="stat-value">{stats.total || 0}</div>
      </div>
      <div className="stat-card warning">
        <div className="stat-label">{t.today}</div>
        <div className="stat-value">{stats.today || 0}</div>
      </div>
      <div className="stat-card info">
        <div className="stat-label">{t.thisWeek}</div>
        <div className="stat-value">{stats.thisWeek || 0}</div>
      </div>
      <div className="stat-card pending">
        <div className="stat-label">{t.pending}</div>
        <div className="stat-value">{stats.pending || 0}</div>
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  const { lang } = useApp();
  const title = alert.title?.[lang] || alert.title?.en || 'Alert';
  const desc = alert.description?.[lang] || alert.description?.en || '';
  const emoji = CATEGORY_EMOJI[alert.category] || '⚡';
  const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`alert-card severity-${alert.severity}`}>
      <span className="alert-icon">{emoji}</span>
      <div className="alert-content">
        <div className="alert-title">{title}</div>
        <div className="alert-meta">
          <span className={`severity-badge ${alert.severity}`}>{SEVERITY_EMOJI[alert.severity]} {alert.severity}</span>
          <span>📍 {alert.region}</span>
          <span>🕐 {time}</span>
        </div>
      </div>
    </div>
  );
}

function AlertFeed() {
  const { alerts, t } = useApp();
  if (!alerts.length) {
    return <div className="empty-state"><div className="emoji">📡</div><p>{t.noAlerts}</p></div>;
  }
  return (
    <div className="alert-feed">
      {alerts.slice(0, 20).map((alert, i) => <AlertCard key={alert._id || i} alert={alert} />)}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useApp();
  return (
    <div className="container">
      <div className="page-header">
        <h1>🚨 {t.title}</h1>
        <p>{t.subtitle}</p>
      </div>
      <StatsCards />
      <div className="dashboard-grid">
        <div className="section-card">
          <div className="section-header">
            <span>📡 {t.liveUpdates}</span>
            <span className="live-badge"><span className="dot"></span>LIVE</span>
          </div>
          <div className="section-body">
            <AlertFeed />
          </div>
        </div>
        <div className="section-card">
          <div className="section-header">
            <span>🗺️ {t.map}</span>
          </div>
          <div className="section-body" style={{ padding: 0 }}>
            <AlertMap />
          </div>
        </div>
      </div>
    </div>
  );
}
