'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/AppContext';
import { api, REGIONS, CATEGORIES, SEVERITIES, REGION_COORDS } from '@/lib/constants';

export default function ReportPage() {
  const { t, user, token } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', region: '', category: 'other', severity: 'medium', lat: '', lng: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!form.title || !form.description || !form.region) { setError('Please fill in all required fields'); return; }
    setSubmitting(true); setError('');
    try {
      const data = {
        title: form.title, description: form.description,
        region: form.region, category: form.category, severity: form.severity,
        location: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : undefined
      };
      const res = await api.post('/api/alerts/report', data, token);
      if (res.success) { setSuccess(true); setForm({ title: '', description: '', region: '', category: 'other', severity: 'medium', lat: '', lng: '' }); }
      else setError(res.message || 'Failed to submit');
    } catch { setError('Network error'); } finally { setSubmitting(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
    });
  };

  const autofillCoords = (region) => {
    const coords = REGION_COORDS[region];
    if (coords) setForm(f => ({ ...f, region, lat: coords[0].toFixed(4), lng: coords[1].toFixed(4) }));
    else setForm(f => ({ ...f, region }));
  };

  if (success) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Alert Reported Successfully</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your report has been submitted and is pending admin verification.</p>
          <button className="btn btn-primary" onClick={() => setSuccess(false)}>Report Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>📢 {t.reportNew}</h1>
        <p>Submit an emergency alert for admin verification</p>
      </div>

      <div className="section-card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="section-body">
          {!user && (
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--amber)' }}>
              ⚠️ You must be logged in to report alerts. <a href="/login" style={{ textDecoration: 'underline' }}>Login here</a>
            </div>
          )}
          {error && (
            <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem', color: '#FCA5A5' }}>
              ❌ {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Alert Title *</label>
              <input className="form-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the alert" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the incident..." required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Region *</label>
                <select className="form-select" value={form.region} onChange={e => autofillCoords(e.target.value)} required>
                  <option value="">Select region</option>
                  {REGIONS.filter(r => r !== 'Nationwide').map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-input" type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="33.8938" />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input className="form-input" type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="35.5018" />
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-secondary" onClick={useMyLocation}>📍 My Location</button>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting || !user} style={{ width: '100%' }}>
                {submitting ? '⏳ Submitting...' : `📢 ${t.submit}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
