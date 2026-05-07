require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Alert = require('./models/Alert');

const COORDS = {
  'Beirut': { lat: 33.8938, lng: 35.5018 },
  'South Lebanon': { lat: 33.2721, lng: 35.2033 },
  'Bekaa': { lat: 33.8463, lng: 35.9020 },
  'North Lebanon': { lat: 34.4367, lng: 35.8497 },
  'Mount Lebanon': { lat: 33.8100, lng: 35.5900 },
  'Nabatieh': { lat: 33.3779, lng: 35.4839 },
  'Baalbek-Hermel': { lat: 34.0047, lng: 36.2110 },
  'Akkar': { lat: 34.5290, lng: 36.0780 }
};
const jitter = () => (Math.random() - 0.5) * 0.15;

const sampleAlerts = [
  { title: { en: 'Airstrikes reported in southern suburbs', ar: 'غارات على الضاحية الجنوبية' }, desc: { en: 'Multiple airstrikes targeted the southern suburbs of Beirut.', ar: 'غارات متعددة استهدفت الضاحية الجنوبية لبيروت.' }, severity: 'critical', category: 'airstrike', region: 'Beirut' },
  { title: { en: 'Drone spotted over Tyre', ar: 'رصد طائرة استطلاع فوق صور' }, desc: { en: 'Unmanned aerial vehicle observed over Tyre city.', ar: 'تم رصد طائرة مسيّرة فوق مدينة صور.' }, severity: 'medium', category: 'drone', region: 'South Lebanon' },
  { title: { en: 'Shelling near border villages', ar: 'قصف بالقرب من القرى الحدودية' }, desc: { en: 'Artillery shelling near border villages in South Lebanon.', ar: 'قصف مدفعي قرب القرى الحدودية.' }, severity: 'high', category: 'shelling', region: 'South Lebanon' },
  { title: { en: 'Sirens activated in Nabatieh', ar: 'صفارات الإنذار في النبطية' }, desc: { en: 'Warning sirens activated across Nabatieh.', ar: 'تفعيل صفارات الإنذار في النبطية.' }, severity: 'high', category: 'siren', region: 'Nabatieh' },
  { title: { en: 'Rocket fire from the south', ar: 'إطلاق صواريخ من الجنوب' }, desc: { en: 'Rocket launches detected from South Lebanon.', ar: 'رصد إطلاق صواريخ من جنوب لبنان.' }, severity: 'high', category: 'rocket', region: 'South Lebanon' },
  { title: { en: 'Explosion in Bekaa Valley', ar: 'انفجار في البقاع' }, desc: { en: 'A large explosion heard in the Bekaa Valley.', ar: 'سُمع انفجار كبير في البقاع.' }, severity: 'high', category: 'explosion', region: 'Bekaa' },
  { title: { en: 'Aid convoy arrives in Tripoli', ar: 'قافلة مساعدات إلى طرابلس' }, desc: { en: 'Humanitarian aid reached Tripoli port.', ar: 'وصول مساعدات إنسانية إلى طرابلس.' }, severity: 'low', category: 'humanitarian', region: 'North Lebanon' },
  { title: { en: 'Drone activity over Baalbek', ar: 'مسيّرات فوق بعلبك' }, desc: { en: 'Multiple drones over Baalbek-Hermel region.', ar: 'رصد مسيّرات فوق بعلبك الهرمل.' }, severity: 'medium', category: 'drone', region: 'Baalbek-Hermel' },
  { title: { en: 'Ceasefire negotiations underway', ar: 'مفاوضات وقف إطلاق النار' }, desc: { en: 'Ceasefire negotiations are actively underway.', ar: 'مفاوضات وقف إطلاق النار جارية.' }, severity: 'low', category: 'news', region: 'Nationwide' },
  { title: { en: 'Airstrike on Mount Lebanon', ar: 'غارة على جبل لبنان' }, desc: { en: 'Airstrike targeted infrastructure in Mount Lebanon.', ar: 'غارة على بنية تحتية في جبل لبنان.' }, severity: 'critical', category: 'airstrike', region: 'Mount Lebanon' },
];

const seed = async () => {
  let mongod;
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lebalert';
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    } catch {
      console.log('⚠️  Local MongoDB unavailable, using in-memory...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
    }
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Alert.deleteMany({});

    const admin = await User.create({ name: 'Admin', email: 'admin@lebalert.com', password: 'admin123', role: 'admin', language: 'en' });
    console.log('✅ Admin: admin@lebalert.com / admin123');
    await User.create({ name: 'Test User', email: 'user@lebalert.com', password: 'user123', role: 'user', language: 'en', preferredRegions: ['Beirut', 'South Lebanon'] });
    console.log('✅ User: user@lebalert.com / user123');

    const now = Date.now();
    for (const s of sampleAlerts) {
      const coord = COORDS[s.region] || COORDS['Beirut'];
      await Alert.create({
        title: s.title, description: s.desc, severity: s.severity, category: s.category,
        region: s.region, source: 'admin', status: 'verified', verifiedBy: admin._id, verifiedAt: new Date(),
        location: { lat: coord.lat + jitter(), lng: coord.lng + jitter(), address: { en: s.region, ar: '' } },
        createdAt: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
    console.log(`✅ Created ${sampleAlerts.length} sample alerts`);
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
};

seed();
