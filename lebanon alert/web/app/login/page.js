'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/AppContext';
import { api } from '@/lib/constants';

export default function LoginPage() {
  const { t, login } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(form.email, form.password);
        if (res.success) router.push('/');
        else setError(res.message || 'Invalid credentials');
      } else {
        const res = await api.post('/api/auth/register', form);
        if (res.success) {
          await login(form.email, form.password);
          router.push('/');
        } else setError(res.message || 'Registration failed');
      }
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="section-card" style={{ width: '100%', maxWidth: 440 }}>
        <div className="section-header" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚨</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{mode === 'login' ? t.login : t.register}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Lebanon Red Alert System</p>
        </div>
        <div className="section-body" style={{ padding: '1.5rem 2rem 2rem' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.85rem', color: '#FCA5A5' }}>
              ❌ {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">{t.name}</label>
                <input className="form-input" type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t.email}</label>
              <input className="form-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.password}</label>
              <input className="form-input" type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? '⏳...' : mode === 'login' ? `🔐 ${t.login}` : `📝 ${t.register}`}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <span>No account? <button onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--red-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Register</button></span>
            ) : (
              <span>Have an account? <button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--red-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Login</button></span>
            )}
          </div>
          {/* Demo credentials hidden for production */}
        </div>
      </div>
    </div>
  );
}
