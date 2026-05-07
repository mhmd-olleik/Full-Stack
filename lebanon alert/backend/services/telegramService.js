const axios = require('axios');
const Alert = require('../models/Alert');

// Telegram Bot API - monitors channels for alert keywords
const TELEGRAM_API = 'https://api.telegram.org/bot';
const ALERT_KEYWORDS = [
  'airstrike', 'غارة', 'drone', 'مسيّرة', 'siren', 'صفارة',
  'shelling', 'قصف', 'rocket', 'صاروخ', 'explosion', 'انفجار',
  'breaking', 'عاجل', 'alert', 'تنبيه', 'urgent', 'طارئ'
];

const REGION_MAP = {
  'beirut': 'Beirut', 'بيروت': 'Beirut',
  'south': 'South Lebanon', 'الجنوب': 'South Lebanon', 'صور': 'South Lebanon',
  'bekaa': 'Bekaa', 'البقاع': 'Bekaa',
  'north': 'North Lebanon', 'الشمال': 'North Lebanon', 'طرابلس': 'North Lebanon',
  'mount lebanon': 'Mount Lebanon', 'جبل لبنان': 'Mount Lebanon',
  'nabatieh': 'Nabatieh', 'النبطية': 'Nabatieh',
  'baalbek': 'Baalbek-Hermel', 'بعلبك': 'Baalbek-Hermel',
  'akkar': 'Akkar', 'عكار': 'Akkar'
};

const detectRegion = (text) => {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(REGION_MAP)) {
    if (lower.includes(key)) return value;
  }
  return 'Nationwide';
};

const detectSeverity = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('airstrike') || lower.includes('غارة') || lower.includes('explosion') || lower.includes('انفجار'))
    return 'critical';
  if (lower.includes('rocket') || lower.includes('صاروخ') || lower.includes('shelling') || lower.includes('قصف'))
    return 'high';
  if (lower.includes('drone') || lower.includes('مسيّرة') || lower.includes('siren') || lower.includes('صفارة'))
    return 'medium';
  return 'low';
};

const detectCategory = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('airstrike') || lower.includes('غارة')) return 'airstrike';
  if (lower.includes('drone') || lower.includes('مسيّرة')) return 'drone';
  if (lower.includes('siren') || lower.includes('صفارة')) return 'siren';
  if (lower.includes('shell') || lower.includes('قصف')) return 'shelling';
  if (lower.includes('rocket') || lower.includes('صاروخ')) return 'rocket';
  if (lower.includes('explo') || lower.includes('انفجار')) return 'explosion';
  return 'news';
};

let lastUpdateId = 0;

const pollTelegramUpdates = async () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    const res = await axios.get(`${TELEGRAM_API}${botToken}/getUpdates`, {
      params: { offset: lastUpdateId + 1, timeout: 5 },
      timeout: 15000
    });

    const updates = res.data?.result || [];
    let created = 0;

    for (const update of updates) {
      lastUpdateId = update.update_id;
      const msg = update.message || update.channel_post;
      if (!msg?.text) continue;

      const text = msg.text;
      const hasKeyword = ALERT_KEYWORDS.some(k => text.toLowerCase().includes(k));
      if (!hasKeyword) continue;

      const existing = await Alert.findOne({
        source: 'telegram',
        'title.en': text.substring(0, 100)
      });
      if (existing) continue;

      await Alert.create({
        title: { en: text.substring(0, 100), ar: text.substring(0, 100) },
        description: { en: text, ar: text },
        severity: detectSeverity(text),
        category: detectCategory(text),
        region: detectRegion(text),
        source: 'telegram',
        sourceUrl: '',
        status: 'pending'
      });
      created++;
    }

    if (created > 0) console.log(`📨 Telegram: ${created} new alerts detected`);
    return created;
  } catch (error) {
    if (error.code !== 'ECONNABORTED') {
      console.error('❌ Telegram poll error:', error.message);
    }
    return 0;
  }
};

module.exports = { pollTelegramUpdates };
