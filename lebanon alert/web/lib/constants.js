const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = {
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}${endpoint}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    return res.json();
  },
  async post(endpoint, data, token) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async put(endpoint, data, token) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async del(endpoint, token) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    return res.json();
  }
};

export const REGIONS = ['Beirut', 'South Lebanon', 'Bekaa', 'North Lebanon', 'Mount Lebanon', 'Nabatieh', 'Baalbek-Hermel', 'Akkar', 'Nationwide'];
export const CATEGORIES = ['airstrike', 'drone', 'siren', 'shelling', 'rocket', 'explosion', 'news', 'humanitarian', 'other'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const SEVERITY_COLORS = {
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

export const SEVERITY_EMOJI = { low: 'ℹ️', medium: '⚠️', high: '🔴', critical: '🚨' };

export const CATEGORY_EMOJI = {
  airstrike: '💥', drone: '🛩️', siren: '📢', shelling: '💣',
  rocket: '🚀', explosion: '🔥', news: '📰', humanitarian: '🏥', other: '⚡'
};

export const REGION_COORDS = {
  'Beirut': [33.8938, 35.5018],
  'South Lebanon': [33.2721, 35.2033],
  'Bekaa': [33.8463, 35.9020],
  'North Lebanon': [34.4367, 35.8497],
  'Mount Lebanon': [33.8100, 35.5900],
  'Nabatieh': [33.3779, 35.4839],
  'Baalbek-Hermel': [34.0047, 36.2110],
  'Akkar': [34.5290, 36.0780],
  'Nationwide': [33.8547, 35.8623]
};

export const translations = {
  en: {
    title: 'Lebanon Red Alert',
    subtitle: 'Real-Time Emergency Alert System',
    dashboard: 'Dashboard', alerts: 'Alerts', map: 'Map', admin: 'Admin', report: 'Report Alert',
    totalAlerts: 'Total Alerts', today: 'Today', thisWeek: 'This Week', pending: 'Pending',
    severity: 'Severity', region: 'Region', category: 'Category', allRegions: 'All Regions',
    allSeverities: 'All Severities', allCategories: 'All Categories', search: 'Search alerts...',
    noAlerts: 'No alerts found', loading: 'Loading...', liveUpdates: 'Live Updates',
    reportNew: 'Report New Alert', submit: 'Submit', cancel: 'Cancel',
    verify: 'Verify', reject: 'Reject', delete: 'Delete', edit: 'Edit',
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
    login: 'Login', register: 'Register', logout: 'Logout',
    email: 'Email', password: 'Password', name: 'Name'
  },
  ar: {
    title: 'إنذار لبنان الأحمر',
    subtitle: 'نظام تنبيه الطوارئ في الوقت الحقيقي',
    dashboard: 'لوحة القيادة', alerts: 'التنبيهات', map: 'الخريطة', admin: 'الإدارة', report: 'إبلاغ عن تنبيه',
    totalAlerts: 'إجمالي التنبيهات', today: 'اليوم', thisWeek: 'هذا الأسبوع', pending: 'قيد الانتظار',
    severity: 'الخطورة', region: 'المنطقة', category: 'الفئة', allRegions: 'كل المناطق',
    allSeverities: 'كل المستويات', allCategories: 'كل الفئات', search: 'ابحث عن تنبيهات...',
    noAlerts: 'لا توجد تنبيهات', loading: 'جاري التحميل...', liveUpdates: 'تحديثات مباشرة',
    reportNew: 'إبلاغ عن تنبيه جديد', submit: 'إرسال', cancel: 'إلغاء',
    verify: 'تحقق', reject: 'رفض', delete: 'حذف', edit: 'تعديل',
    critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض',
    login: 'تسجيل الدخول', register: 'تسجيل', logout: 'خروج',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'الاسم'
  }
};
