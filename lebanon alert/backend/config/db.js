const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let useMemoryDB = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lebalert';
  
  // Try local MongoDB
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (e) {
    console.log('⚠️  Local MongoDB not available...');
  }

  // Try mongodb-memory-server
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('🔄 Starting in-memory MongoDB (first run downloads ~300MB binary)...');
    const mongod = await MongoMemoryServer.create();
    const conn = await mongoose.connect(mongod.getUri());
    console.log(`✅ In-Memory MongoDB running: ${conn.connection.host}`);
    process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
    return;
  } catch (e) {
    console.log('⚠️  mongodb-memory-server not ready yet...');
  }

  // Final fallback: mock mongoose with JSON file store
  console.log('📁 Using JSON file-based storage (development fallback)');
  useMemoryDB = true;
  await setupJSONStore();
};

// Simple JSON file storage fallback
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ alerts: [], users: [] }, null, 2));
  }
}

function readDB() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function setupJSONStore() {
  ensureDataDir();
  const db = readDB();
  
  // Seed if empty
  if (db.alerts.length === 0) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    
    db.users = [
      { _id: 'admin001', name: 'Admin', email: 'admin@lebalert.com', password: await bcrypt.hash('admin123', salt), role: 'admin', language: 'en', fcmTokens: [], preferredRegions: [], createdAt: new Date().toISOString() },
      { _id: 'user001', name: 'Test User', email: 'user@lebalert.com', password: await bcrypt.hash('user123', salt), role: 'user', language: 'en', fcmTokens: [], preferredRegions: ['Beirut', 'South Lebanon'], createdAt: new Date().toISOString() }
    ];
    
    const COORDS = { 'Beirut': [33.8938, 35.5018], 'South Lebanon': [33.2721, 35.2033], 'Bekaa': [33.8463, 35.9020], 'North Lebanon': [34.4367, 35.8497], 'Mount Lebanon': [33.81, 35.59], 'Nabatieh': [33.3779, 35.4839], 'Baalbek-Hermel': [34.0047, 36.211], 'Akkar': [34.529, 36.078] };
    const j = () => (Math.random() - 0.5) * 0.15;
    const now = Date.now();
    
    const samples = [
      { t: { en: 'Airstrikes in southern suburbs', ar: 'غارات على الضاحية الجنوبية' }, d: { en: 'Multiple airstrikes targeted the southern suburbs of Beirut. Residents urged to seek shelter.', ar: 'غارات متعددة استهدفت الضاحية الجنوبية لبيروت.' }, s: 'critical', c: 'airstrike', r: 'Beirut' },
      { t: { en: 'Drone spotted over Tyre', ar: 'رصد طائرة فوق صور' }, d: { en: 'Unmanned aerial vehicle observed over Tyre city.', ar: 'تم رصد طائرة مسيّرة فوق صور.' }, s: 'medium', c: 'drone', r: 'South Lebanon' },
      { t: { en: 'Shelling near border villages', ar: 'قصف بالقرب من القرى الحدودية' }, d: { en: 'Artillery shelling reported near border villages.', ar: 'قصف مدفعي قرب القرى الحدودية.' }, s: 'high', c: 'shelling', r: 'South Lebanon' },
      { t: { en: 'Sirens activated in Nabatieh', ar: 'صفارات الإنذار في النبطية' }, d: { en: 'Warning sirens activated across Nabatieh.', ar: 'تفعيل صفارات الإنذار في النبطية.' }, s: 'high', c: 'siren', r: 'Nabatieh' },
      { t: { en: 'Rocket fire detected', ar: 'إطلاق صواريخ' }, d: { en: 'Rocket launches detected from South Lebanon.', ar: 'رصد إطلاق صواريخ من جنوب لبنان.' }, s: 'high', c: 'rocket', r: 'South Lebanon' },
      { t: { en: 'Explosion in Bekaa Valley', ar: 'انفجار في البقاع' }, d: { en: 'Large explosion heard in the Bekaa Valley.', ar: 'سُمع انفجار كبير في البقاع.' }, s: 'high', c: 'explosion', r: 'Bekaa' },
      { t: { en: 'Aid convoy arrives in Tripoli', ar: 'قافلة مساعدات إلى طرابلس' }, d: { en: 'Humanitarian aid reached Tripoli port.', ar: 'وصول مساعدات إلى طرابلس.' }, s: 'low', c: 'humanitarian', r: 'North Lebanon' },
      { t: { en: 'Drone activity over Baalbek', ar: 'مسيّرات فوق بعلبك' }, d: { en: 'Multiple drones over Baalbek-Hermel.', ar: 'رصد مسيّرات فوق بعلبك.' }, s: 'medium', c: 'drone', r: 'Baalbek-Hermel' },
      { t: { en: 'Ceasefire talks underway', ar: 'مفاوضات وقف إطلاق النار' }, d: { en: 'Ceasefire negotiations are underway.', ar: 'مفاوضات وقف إطلاق النار جارية.' }, s: 'low', c: 'news', r: 'Nationwide' },
      { t: { en: 'Airstrike on Mount Lebanon', ar: 'غارة على جبل لبنان' }, d: { en: 'Airstrike targeted infrastructure in Mount Lebanon.', ar: 'غارة على جبل لبنان.' }, s: 'critical', c: 'airstrike', r: 'Mount Lebanon' },
    ];

    samples.forEach((s, i) => {
      const co = COORDS[s.r] || COORDS['Beirut'];
      db.alerts.push({
        _id: `alert${String(i+1).padStart(3,'0')}`,
        title: s.t, description: s.d, severity: s.s, category: s.c, region: s.r,
        source: 'admin', status: 'verified', verifiedBy: 'admin001', verifiedAt: new Date().toISOString(),
        location: { lat: co[0] + j(), lng: co[1] + j(), address: { en: s.r, ar: '' } },
        notificationSent: false, tags: [], media: [],
        createdAt: new Date(now - Math.random() * 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    writeDB(db);
    console.log('✅ Seeded 10 sample alerts + 2 users');
    console.log('   Admin: admin@lebalert.com / admin123');
  }
}

const isUsingJSONStore = () => useMemoryDB;
const getJSONDB = () => ({ readDB, writeDB });

module.exports = { connectDB, isUsingJSONStore, getJSONDB };
