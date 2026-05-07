'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { api, REGIONS, CATEGORIES, SEVERITIES, SEVERITY_EMOJI, CATEGORY_EMOJI } from '@/lib/constants';

export default function AdminPage() {
  const { t, lang, user, token, fetchStats } = useApp();
  const [tab, setTab] = useState('pending');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ titleEn: '', titleAr: '', descEn: '', descAr: '', region: '', category: 'other', severity: 'medium' });

  const load = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'pending') res = await api.get('/api/alerts', { status: 'pending', limit: 50 });
      else res = await api.get('/api/alerts', { limit: 50 });
      if (res.success) setAlerts(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="container">
        <div className="empty-state" style={{ minHeight: '60vh' }}>
          <div className="emoji">🔒</div>
          <p>Admin access required. Please login with an admin account.</p>
          <a href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>Login</a>
        </div>
      </div>
    );
  }

  const verify = async (id, severity) => {
    await api.put(`/api/admin/alerts/${id}/verify`, { severity }, token);
    load(); fetchStats();
  };
  const reject = async (id) => {
    await api.put(`/api/admin/alerts/${id}/reject`, {}, token);
    load(); fetchStats();
  };
  const del = async (id) => {
    if (!confirm('Delete this alert?')) return;
    await api.del(`/api/admin/alerts/${id}`, token);
    load(); fetchStats();
  };
  const changeSeverity = async (id, severity) => {
    await api.put(`/api/admin/alerts/${id}/severity`, { severity }, token);
    load();
  };
  const createAlert = async (e) => {
    e.preventDefault();
    const data = {
      title: { en: form.titleEn, ar: form.titleAr },
      description: { en: form.descEn, ar: form.descAr },
      region: form.region, category: form.category, severity: form.severity
    };
    await api.post('/api/admin/alerts', data, token);
    setShowCreate(false);
    setForm({ titleEn: '', titleAr: '', descEn: '', descAr: '', region: '', category: 'other', severity: 'medium' });
    load(); fetchStats();
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🛡️ {t.admin}</h1>
          <p>Manage alerts, verify reports, and control the alert system</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Alert</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <button className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('pending')}>
          📋 Pending Reports
        </button>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('all')}>
          📑 All Alerts
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <div className="section-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Alert</th><th>Region</th><th>Severity</th><th>Category</th><th>Source</th><th>Status</th><th>Time</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No alerts found</td></tr>
                ) : alerts.map(alert => (
                  <tr key={alert._id}>
                    <td style={{ maxWidth: 250 }}>
                      <strong>{CATEGORY_EMOJI[alert.category]} {(alert.title?.[lang] || alert.title?.en || '').substring(0, 50)}</strong>
                    </td>
                    <td>📍 {alert.region}</td>
                    <td>
                      <select value={alert.severity} onChange={e => changeSeverity(alert._id, e.target.value)}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem' }}>
                        {SEVERITIES.map(s => <option key={s} value={s}>{SEVERITY_EMOJI[s]} {s}</option>)}
                      </select>
                    </td>
                    <td>{alert.category}</td>
                    <td>{alert.source}</td>
                    <td><span className={`severity-badge ${alert.status === 'verified' ? 'low' : alert.status === 'pending' ? 'medium' : 'high'}`}>{alert.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(alert.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-actions">
                        {alert.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => verify(alert._id, alert.severity)}>✓</button>
                            <button className="btn btn-warning btn-sm" onClick={() => reject(alert._id)}>✗</button>
                          </>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => del(alert._id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📝 Create New Alert</div>
            <form onSubmit={createAlert}>
              <div className="form-group"><label className="form-label">Title (EN) *</label><input className="form-input" required value={form.titleEn} onChange={e => setForm(f => ({...f, titleEn: e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Title (AR)</label><input className="form-input" dir="rtl" value={form.titleAr} onChange={e => setForm(f => ({...f, titleAr: e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Description (EN) *</label><textarea className="form-textarea" required value={form.descEn} onChange={e => setForm(f => ({...f, descEn: e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Description (AR)</label><textarea className="form-textarea" dir="rtl" value={form.descAr} onChange={e => setForm(f => ({...f, descAr: e.target.value}))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Region *</label><select className="form-select" required value={form.region} onChange={e => setForm(f => ({...f, region: e.target.value}))}><option value="">Select</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Severity</label><select className="form-select" value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary">🚨 Publish Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
