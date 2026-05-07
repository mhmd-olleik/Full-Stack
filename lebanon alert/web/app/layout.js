'use client';
import './globals.css';
import { AppProvider, useApp } from '@/lib/AppContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Navbar() {
  const { t, lang, toggleLang, user, logout, connected } = useApp();
  const pathname = usePathname();

  const links = [
    { href: '/', label: t.dashboard },
    { href: '/alerts', label: t.alerts },
    { href: '/report', label: t.report },
  ];

  if (user?.role === 'admin') {
    links.push({ href: '/admin', label: t.admin });
  }

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <span className="pulse-dot"></span>
        <span>🚨 {t.title}</span>
      </Link>

      <ul className="navbar-links">
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href} className={pathname === link.href ? 'active' : ''}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="navbar-actions">
        {connected && (
          <span className="live-badge">
            <span className="dot"></span>
            LIVE
          </span>
        )}
        <button className="lang-toggle" onClick={toggleLang}>
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>
        {user ? (
          <button className="btn btn-sm btn-secondary" onClick={logout}>{t.logout}</button>
        ) : (
          <Link href="/login" className="btn btn-sm btn-primary">{t.login}</Link>
        )}
      </div>
    </nav>
  );
}

function LayoutInner({ children }) {
  const { isRTL } = useApp();
  return (
    <html lang={isRTL ? 'ar' : 'en'} dir={isRTL ? 'rtl' : 'ltr'}>
      <head>
        <title>Lebanon Red Alert 🚨 - Real-Time Emergency Alert System</title>
        <meta name="description" content="Real-time emergency alert system for Lebanon. Track airstrikes, drones, rockets, and breaking news with live updates and interactive maps." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚨</text></svg>" />
      </head>
      <body dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }) {
  return (
    <AppProvider>
      <LayoutInner>{children}</LayoutInner>
    </AppProvider>
  );
}
