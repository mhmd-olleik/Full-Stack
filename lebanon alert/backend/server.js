require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
app.set('io', io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ============ JSON FILE DATABASE ============
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { alerts: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ============ SEED DATA ============
async function seedIfEmpty() {
  let db = loadDB();
  if (db.alerts.length > 0) { console.log(`📦 Loaded ${db.alerts.length} alerts, ${db.users.length} users`); return; }

  const salt = await bcrypt.genSalt(12);
  db.users = [
    { _id: genId(), name: 'Admin', email: 'admin@lebalert.com', password: await bcrypt.hash('admin123', salt), role: 'admin', language: 'en', fcmTokens: [], preferredRegions: [], notificationSettings: { enabled: true, minSeverity: 'medium', sound: true, vibration: true }, createdAt: new Date().toISOString() },
    { _id: genId(), name: 'Test User', email: 'user@lebalert.com', password: await bcrypt.hash('user123', salt), role: 'user', language: 'en', fcmTokens: [], preferredRegions: ['Beirut', 'South Lebanon'], notificationSettings: { enabled: true, minSeverity: 'medium', sound: true, vibration: true }, createdAt: new Date().toISOString() }
  ];

  const C = { 'Beirut': [33.89, 35.50], 'South Lebanon': [33.27, 35.20], 'Bekaa': [33.85, 35.90], 'North Lebanon': [34.44, 35.85], 'Mount Lebanon': [33.81, 35.59], 'Nabatieh': [33.38, 35.48], 'Baalbek-Hermel': [34.00, 36.21], 'Akkar': [34.53, 36.08] };
  const j = () => (Math.random() - 0.5) * 0.12;
  const now = Date.now();

  const samples = [
    { t: { en: 'Airstrikes reported in southern suburbs', ar: 'غارات على الضاحية الجنوبية' }, d: { en: 'Multiple airstrikes targeted the southern suburbs of Beirut. Residents urged to seek shelter immediately.', ar: 'غارات متعددة استهدفت الضاحية الجنوبية لبيروت. يُطلب من السكان الاحتماء فوراً.' }, s: 'critical', c: 'airstrike', r: 'Beirut' },
    { t: { en: 'Reconnaissance drone spotted over Tyre', ar: 'رصد طائرة استطلاع فوق صور' }, d: { en: 'Unmanned aerial vehicle observed circling over Tyre city. No immediate threat reported.', ar: 'تم رصد طائرة مسيّرة تحلق فوق مدينة صور. لا تهديد فوري.' }, s: 'medium', c: 'drone', r: 'South Lebanon' },
    { t: { en: 'Heavy shelling near border villages', ar: 'قصف عنيف قرب القرى الحدودية' }, d: { en: 'Intense artillery shelling reported near multiple border villages in South Lebanon.', ar: 'قصف مدفعي عنيف بالقرب من عدة قرى حدودية في جنوب لبنان.' }, s: 'high', c: 'shelling', r: 'South Lebanon' },
    { t: { en: 'Warning sirens activated in Nabatieh', ar: 'تفعيل صفارات الإنذار في النبطية' }, d: { en: 'Emergency warning sirens activated across Nabatieh governorate. Seek shelter.', ar: 'تفعيل صفارات الإنذار في محافظة النبطية. ابحثوا عن مأوى.' }, s: 'high', c: 'siren', r: 'Nabatieh' },
    { t: { en: 'Rocket launches detected from the south', ar: 'رصد إطلاق صواريخ من الجنوب' }, d: { en: 'Multiple rocket launches detected from areas in South Lebanon toward hostile territory.', ar: 'رصد إطلاق صواريخ متعددة من مناطق في جنوب لبنان.' }, s: 'high', c: 'rocket', r: 'South Lebanon' },
    { t: { en: 'Large explosion heard in Bekaa Valley', ar: 'انفجار كبير في وادي البقاع' }, d: { en: 'A powerful explosion was heard across the Bekaa Valley. Cause under investigation.', ar: 'سُمع انفجار قوي في وادي البقاع. السبب قيد التحقيق.' }, s: 'high', c: 'explosion', r: 'Bekaa' },
    { t: { en: 'Humanitarian aid convoy reaches Tripoli', ar: 'قافلة مساعدات إنسانية تصل طرابلس' }, d: { en: 'International humanitarian aid convoy successfully reached Tripoli port with medical supplies.', ar: 'وصلت قافلة مساعدات إنسانية دولية إلى مرفأ طرابلس بإمدادات طبية.' }, s: 'low', c: 'humanitarian', r: 'North Lebanon' },
    { t: { en: 'Drone swarm activity over Baalbek', ar: 'نشاط سرب مسيّرات فوق بعلبك' }, d: { en: 'Multiple reconnaissance drones observed operating in formation over Baalbek-Hermel region.', ar: 'رصد عدة مسيّرات استطلاع تعمل بتشكيل فوق منطقة بعلبك الهرمل.' }, s: 'medium', c: 'drone', r: 'Baalbek-Hermel' },
    { t: { en: 'Breaking: Ceasefire negotiations underway', ar: 'عاجل: مفاوضات وقف إطلاق النار جارية' }, d: { en: 'High-level diplomatic sources report active ceasefire negotiations between all parties.', ar: 'مصادر دبلوماسية رفيعة تفيد بمفاوضات نشطة لوقف إطلاق النار.' }, s: 'low', c: 'news', r: 'Nationwide' },
    { t: { en: 'Airstrike targets infrastructure in Mount Lebanon', ar: 'غارة تستهدف بنية تحتية في جبل لبنان' }, d: { en: 'Airstrike targeted critical infrastructure facility in Mount Lebanon region. Casualties reported.', ar: 'غارة جوية استهدفت منشأة بنية تحتية حيوية في جبل لبنان. أُبلغ عن إصابات.' }, s: 'critical', c: 'airstrike', r: 'Mount Lebanon' },
  ];

  samples.forEach((s, i) => {
    const co = C[s.r] || C['Beirut'];
    db.alerts.push({
      _id: genId(), title: s.t, description: s.d, severity: s.s, category: s.c, region: s.r,
      source: 'admin', status: 'verified', verifiedBy: db.users[0]._id, verifiedAt: new Date().toISOString(),
      location: { lat: co[0] + j(), lng: co[1] + j(), address: { en: s.r, ar: '' } },
      notificationSent: false, tags: [], media: [],
      createdAt: new Date(now - Math.random() * 7 * 86400000).toISOString(), updatedAt: new Date().toISOString()
    });
  });

  saveDB(db);
  console.log('✅ Seeded 10 alerts + 2 users (admin@lebalert.com / admin123)');
}

// ============ AUTH HELPERS ============
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'lebalert_dev_secret_2024', { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lebalert_dev_secret_2024');
    const db = loadDB();
    req.user = db.users.find(u => u._id === decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role === 'admin') next();
  else res.status(403).json({ success: false, message: 'Admin required' });
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, language } = req.body;
    const db = loadDB();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ success: false, message: 'Email exists' });
    const salt = await bcrypt.genSalt(12);
    const user = { _id: genId(), name, email, password: await bcrypt.hash(password, salt), role: 'user', language: language || 'en', fcmTokens: [], preferredRegions: [], notificationSettings: { enabled: true, minSeverity: 'medium', sound: true, vibration: true }, createdAt: new Date().toISOString() };
    db.users.push(user);
    saveDB(db);
    res.status(201).json({ success: true, data: { _id: user._id, name, email, role: 'user', language: user.language, token: generateToken(user._id) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = loadDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    res.json({ success: true, data: { _id: user._id, name: user.name, email, role: user.role, language: user.language, token: generateToken(user._id) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { password, ...user } = req.user;
  res.json({ success: true, data: user });
});

app.post('/api/auth/fcm-token', authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u._id === req.user._id);
  if (user) { user.fcmTokens = [...(user.fcmTokens || []).filter(t => t.token !== req.body.token), { token: req.body.token, platform: req.body.platform || 'web' }]; saveDB(db); }
  res.json({ success: true });
});

// ============ ALERT ROUTES ============
app.get('/api/alerts', (req, res) => {
  const db = loadDB();
  let alerts = db.alerts.filter(a => a.status === (req.query.status || 'verified'));
  if (req.query.region) alerts = alerts.filter(a => a.region === req.query.region);
  if (req.query.severity) alerts = alerts.filter(a => a.severity === req.query.severity);
  if (req.query.category) alerts = alerts.filter(a => a.category === req.query.category);
  if (req.query.search) { const s = req.query.search.toLowerCase(); alerts = alerts.filter(a => (a.title?.en + a.title?.ar + a.description?.en + a.description?.ar).toLowerCase().includes(s)); }
  alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 20;
  const total = alerts.length;
  alerts = alerts.slice((page - 1) * limit, page * limit);
  res.json({ success: true, data: alerts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

app.get('/api/alerts/stats', (req, res) => {
  const db = loadDB();
  const verified = db.alerts.filter(a => a.status === 'verified');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(now - 7 * 86400000);
  const bySev = {}, byReg = {}, byCat = {};
  verified.forEach(a => { bySev[a.severity] = (bySev[a.severity] || 0) + 1; byReg[a.region] = (byReg[a.region] || 0) + 1; byCat[a.category] = (byCat[a.category] || 0) + 1; });
  res.json({ success: true, data: {
    total: verified.length,
    today: verified.filter(a => new Date(a.createdAt) >= today).length,
    thisWeek: verified.filter(a => new Date(a.createdAt) >= week).length,
    pending: db.alerts.filter(a => a.status === 'pending').length,
    bySeverity: bySev, byRegion: byReg, byCategory: byCat
  }});
});

app.get('/api/alerts/map', (req, res) => {
  const db = loadDB();
  const hours = parseInt(req.query.hours) || 168;
  const since = new Date(Date.now() - hours * 3600000);
  const alerts = db.alerts.filter(a => a.status === 'verified' && a.location?.lat && a.location?.lng && new Date(a.createdAt) >= since);
  res.json({ success: true, data: alerts });
});

app.get('/api/alerts/regions', (req, res) => {
  const db = loadDB();
  const regionMap = {};
  db.alerts.filter(a => a.status === 'verified').forEach(a => {
    if (!regionMap[a.region]) regionMap[a.region] = { _id: a.region, count: 0, critical: 0, high: 0, latest: a.createdAt };
    regionMap[a.region].count++;
    if (a.severity === 'critical') regionMap[a.region].critical++;
    if (a.severity === 'high') regionMap[a.region].high++;
    if (new Date(a.createdAt) > new Date(regionMap[a.region].latest)) regionMap[a.region].latest = a.createdAt;
  });
  res.json({ success: true, data: Object.values(regionMap).sort((a, b) => b.count - a.count) });
});

app.get('/api/alerts/:id', (req, res) => {
  const db = loadDB();
  const alert = db.alerts.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: alert });
});

app.post('/api/alerts/report', authMiddleware, (req, res) => {
  const db = loadDB();
  const { title, description, category, region, location, severity } = req.body;
  const alert = {
    _id: genId(),
    title: typeof title === 'string' ? { en: title, ar: '' } : title,
    description: typeof description === 'string' ? { en: description, ar: '' } : description,
    category: category || 'other', region, location, severity: severity || 'medium',
    source: 'user_report', status: 'pending', reportedBy: req.user._id,
    notificationSent: false, tags: [], media: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.alerts.push(alert);
  saveDB(db);
  io.to('admins').emit('new-report', { alert, reportedBy: { name: req.user.name } });
  res.status(201).json({ success: true, data: alert, message: 'Alert reported. Pending verification.' });
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/pending', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const pending = db.alerts.filter(a => a.status === 'pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: pending, pagination: { page: 1, limit: 50, total: pending.length, pages: 1 } });
});

app.post('/api/admin/alerts', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const data = req.body;
  const alert = {
    _id: genId(),
    title: typeof data.title === 'string' ? { en: data.title, ar: '' } : data.title || { en: '', ar: '' },
    description: typeof data.description === 'string' ? { en: data.description, ar: '' } : data.description || { en: '', ar: '' },
    severity: data.severity || 'medium', category: data.category || 'other', region: data.region || 'Nationwide',
    location: data.location || {}, source: 'admin', status: 'verified',
    verifiedBy: req.user._id, verifiedAt: new Date().toISOString(),
    notificationSent: false, tags: [], media: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.alerts.push(alert);
  saveDB(db);
  io.emit('new-alert', alert);
  res.status(201).json({ success: true, data: alert });
});

app.put('/api/admin/alerts/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const idx = db.alerts.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  db.alerts[idx] = { ...db.alerts[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveDB(db);
  io.emit('alert-updated', db.alerts[idx]);
  res.json({ success: true, data: db.alerts[idx] });
});

app.put('/api/admin/alerts/:id/verify', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const alert = db.alerts.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Not found' });
  alert.status = 'verified'; alert.verifiedBy = req.user._id; alert.verifiedAt = new Date().toISOString();
  if (req.body.severity) alert.severity = req.body.severity;
  saveDB(db);
  io.emit('new-alert', alert);
  res.json({ success: true, data: alert });
});

app.put('/api/admin/alerts/:id/reject', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const alert = db.alerts.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Not found' });
  alert.status = 'rejected'; alert.verifiedBy = req.user._id; alert.verifiedAt = new Date().toISOString();
  saveDB(db);
  res.json({ success: true, data: alert });
});

app.put('/api/admin/alerts/:id/severity', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  const alert = db.alerts.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Not found' });
  alert.severity = req.body.severity;
  saveDB(db);
  io.emit('alert-updated', alert);
  res.json({ success: true, data: alert });
});

app.delete('/api/admin/alerts/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = loadDB();
  db.alerts = db.alerts.filter(a => a._id !== req.params.id);
  saveDB(db);
  io.emit('alert-deleted', { id: req.params.id });
  res.json({ success: true, message: 'Deleted' });
});

// ============ ROOT & HEALTH ============
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lebanon Red Alert API</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#f0f0f5;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{max-width:600px;padding:2rem;text-align:center}.badge{background:#DC2626;color:#fff;padding:.3rem .8rem;border-radius:20px;font-size:.75rem;font-weight:700;display:inline-block;margin-bottom:1rem}
h1{font-size:2rem;margin-bottom:.5rem}h1 span{color:#DC2626}.sub{color:#8888a0;margin-bottom:2rem}
.endpoints{text-align:left;background:#12121a;border:1px solid #2a2a3e;border-radius:12px;padding:1.5rem;margin-top:1.5rem}
.endpoints h3{color:#DC2626;margin-bottom:1rem;font-size:.9rem;text-transform:uppercase;letter-spacing:1px}
.ep{padding:.4rem 0;font-family:monospace;font-size:.85rem;color:#a0a0b8}.ep a{color:#60a5fa;text-decoration:none}.ep a:hover{text-decoration:underline}
.footer{margin-top:2rem;color:#5a5a70;font-size:.75rem}</style></head>
<body><div class="c"><div class="badge">● LIVE</div><h1>🚨 Lebanon <span>Red Alert</span> API</h1><p class="sub">Real-time security alert system for Lebanon</p>
<div class="endpoints"><h3>📡 API Endpoints</h3>
<div class="ep">GET <a href="/api/health">/api/health</a> — Status check</div>
<div class="ep">GET <a href="/api/alerts">/api/alerts</a> — All verified alerts</div>
<div class="ep">GET <a href="/api/alerts/stats">/api/alerts/stats</a> — Statistics</div>
<div class="ep">GET <a href="/api/alerts/map">/api/alerts/map</a> — Map data</div>
<div class="ep">GET <a href="/api/alerts/regions">/api/alerts/regions</a> — By region</div>
<div class="ep">GET <a href="/api/sources/status">/api/sources/status</a> — Data sources</div>
<div class="ep">POST /api/auth/login — Login</div>
<div class="ep">POST /api/auth/register — Register</div>
</div><p class="footer">Powered by Ajwa2 API • JSON File Storage • Socket.IO Real-time</p></div></body></html>`);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Lebanon Red Alert API 🚨', storage: 'json-file', sources: ['ajwa2.com', 'redalertlb.com', 'admin', 'user_reports'] });
});

// ============ DATA SOURCES: AJWA2.COM API ============
const AJWA2_API = 'https://ajwa2.com/api.php?action=get_reports';

// Map Ajwa2 types to our categories
const AJWA2_TYPE_MAP = {
  'drone': { category: 'drone', severity: 'medium', en: 'Drone', ar: 'درون' },
  'uav': { category: 'drone', severity: 'medium', en: 'UAV/Drone', ar: 'مسيّرة' },
  'fighter': { category: 'airstrike', severity: 'critical', en: 'Fighter Jet', ar: 'حربي' },
  'airstrike': { category: 'airstrike', severity: 'critical', en: 'Airstrike', ar: 'غارة' },
  'shelling': { category: 'shelling', severity: 'high', en: 'Shelling', ar: 'قصف مدفعي' },
  'explosion': { category: 'explosion', severity: 'high', en: 'Explosion', ar: 'تفجير' },
};

// Detect region from lat/lng coordinates
function detectRegionFromCoords(lat, lng) {
  const regions = [
    { name: 'Beirut', lat: 33.89, lng: 35.50, radius: 0.15 },
    { name: 'South Lebanon', lat: 33.27, lng: 35.20, radius: 0.35 },
    { name: 'Nabatieh', lat: 33.38, lng: 35.48, radius: 0.20 },
    { name: 'Bekaa', lat: 33.85, lng: 35.90, radius: 0.35 },
    { name: 'Mount Lebanon', lat: 33.81, lng: 35.59, radius: 0.25 },
    { name: 'North Lebanon', lat: 34.44, lng: 35.85, radius: 0.35 },
    { name: 'Baalbek-Hermel', lat: 34.00, lng: 36.21, radius: 0.35 },
    { name: 'Akkar', lat: 34.53, lng: 36.08, radius: 0.30 },
  ];
  let closest = 'South Lebanon', minDist = Infinity;
  for (const r of regions) {
    const d = Math.sqrt((lat - r.lat) ** 2 + (lng - r.lng) ** 2);
    if (d < r.radius && d < minDist) { closest = r.name; minDist = d; }
  }
  return closest;
}

// Parse Ajwa2 title for type detection
function parseAjwa2Type(type, title = '') {
  const lower = (type + ' ' + title).toLowerCase();
  if (lower.includes('غارة') || lower.includes('airstrike')) return AJWA2_TYPE_MAP['airstrike'];
  if (lower.includes('حربي') || lower.includes('fighter')) return AJWA2_TYPE_MAP['fighter'];
  if (lower.includes('قصف') || lower.includes('shelling')) return AJWA2_TYPE_MAP['shelling'];
  if (lower.includes('تفجير') || lower.includes('explosion')) return AJWA2_TYPE_MAP['explosion'];
  return AJWA2_TYPE_MAP[type] || AJWA2_TYPE_MAP['drone'];
}

async function fetchAjwa2Alerts() {
  try {
    const res = await axios.get(AJWA2_API, { timeout: 10000 });
    const reports = res.data?.data || [];
    if (!reports.length) return 0;

    const db = loadDB();
    let created = 0;

    for (const report of reports) {
      // Check if already imported (by ajwa2 ID)
      const existingId = db.alerts.find(a => a.sourceId === report.id);
      if (existingId) continue;

      const lat = parseFloat(report.lat);
      const lng = parseFloat(report.lon);
      if (isNaN(lat) || isNaN(lng)) continue;

      const typeInfo = parseAjwa2Type(report.type, report.city_name);
      const region = detectRegionFromCoords(lat, lng);
      const cityName = report.city_name || '';
      const isCircular = report.is_circular_flight === '1';
      const reportSource = report.report_source || 'unknown';

      const alert = {
        _id: genId(),
        sourceId: report.id,
        title: {
          en: `${typeInfo.en} spotted over ${cityName}`,
          ar: `${typeInfo.ar} فوق ${cityName}`
        },
        description: {
          en: `${typeInfo.en} activity reported over ${cityName}${isCircular ? ' (circular flight pattern)' : ''}. Source: ${reportSource} observation via Ajwa2.`,
          ar: `تم رصد ${typeInfo.ar} فوق ${cityName}${isCircular ? ' (تحليق دائري)' : ''}. المصدر: رصد ${reportSource === 'visual' ? 'بصري' : 'سمعي'} عبر أجواء.`
        },
        severity: typeInfo.severity,
        category: typeInfo.category,
        region,
        location: { lat, lng, address: { en: cityName, ar: cityName } },
        source: 'ajwa2',
        sourceUrl: `https://ajwa2.com/index.php?lat=${lat}&lon=${lng}&id=${report.id}`,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        notificationSent: false,
        tags: [report.type, reportSource, isCircular ? 'circular' : 'linear'],
        media: [],
        createdAt: report.created_at ? new Date(report.created_at).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.alerts.push(alert);
      io.emit('new-alert', alert);
      created++;
    }

    if (created > 0) {
      saveDB(db);
      console.log(`✈️  Ajwa2: ${created} new alerts imported (${reports.length} total reports)`);
    }
    return created;
  } catch (error) {
    console.error('❌ Ajwa2 fetch error:', error.message);
    return 0;
  }
}

// ============ DATA SOURCE: API ENDPOINT ============
app.get('/api/sources/ajwa2/fetch', authMiddleware, adminMiddleware, async (req, res) => {
  const count = await fetchAjwa2Alerts();
  res.json({ success: true, message: `Fetched ${count} new alerts from Ajwa2`, count });
});

app.get('/api/sources/ajwa2/raw', async (req, res) => {
  try {
    const r = await axios.get(AJWA2_API, { timeout: 10000 });
    res.json({ success: true, data: r.data?.data || [], source: 'ajwa2.com' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/sources/status', (req, res) => {
  const db = loadDB();
  const sources = {};
  db.alerts.forEach(a => { sources[a.source] = (sources[a.source] || 0) + 1; });
  res.json({
    success: true,
    data: {
      sources,
      ajwa2: { url: 'https://ajwa2.com/api.php', status: 'active', type: 'JSON API' },
      redalertlb: { url: 'https://www.redalertlb.com/', status: 'reference', type: 'Web (no API)' },
      telegram: { channel: '@ajwa2com', status: process.env.TELEGRAM_BOT_TOKEN ? 'active' : 'disabled' },
      reliefweb: { url: 'https://api.reliefweb.int/v1', status: 'active', type: 'REST API' }
    }
  });
});

// ============ AGGREGATOR ============
let aggregatorInterval = null;

function startAggregator() {
  console.log('🔄 Data aggregator started');
  console.log('   ✈️  Ajwa2.com API: polling every 60s');

  // Initial fetch after 3 seconds
  setTimeout(() => fetchAjwa2Alerts(), 3000);

  // Poll every 60 seconds
  aggregatorInterval = setInterval(async () => {
    await fetchAjwa2Alerts();
  }, 60000);
}

// ============ WEBSOCKET ============
io.on('connection', (socket) => {
  console.log(`🔌 Client: ${socket.id}`);
  socket.on('join-admin', () => socket.join('admins'));
  socket.on('subscribe-region', (r) => socket.join(`region:${r}`));
  socket.on('disconnect', () => console.log(`❌ Disconnected: ${socket.id}`));
});

// ============ START ============
const PORT = process.env.PORT || 5000;

(async () => {
  await seedIfEmpty();
  startAggregator();
  server.listen(PORT, () => {
    console.log(`\n🚨 Lebanon Red Alert API running on port ${PORT}`);
    console.log(`   Storage: JSON file (${DB_FILE})`);
    console.log(`   Sources: Ajwa2 API, Admin, User Reports`);
    console.log(`   Admin: admin@lebalert.com / admin123\n`);
  });
})();

