const axios = require('axios');
const Alert = require('../models/Alert');

const RELIEFWEB_API = process.env.RELIEFWEB_API_URL || 'https://api.reliefweb.int/v1';

const fetchReliefWebAlerts = async () => {
  try {
    const response = await axios.get(`${RELIEFWEB_API}/reports`, {
      params: {
        appname: 'lebalert',
        'filter[field]': 'country',
        'filter[value]': 'Lebanon',
        'filter[operator]': 'AND',
        limit: 10,
        sort: 'date:desc',
        fields: { include: ['title', 'body', 'date', 'url', 'source'] }
      },
      timeout: 10000
    });

    const reports = response.data?.data || [];
    let created = 0;

    for (const report of reports) {
      const title = report.fields?.title || '';
      const existing = await Alert.findOne({ 'title.en': title, source: 'reliefweb' });
      if (existing) continue;

      await Alert.create({
        title: { en: title, ar: '' },
        description: { en: (report.fields?.body || '').substring(0, 500), ar: '' },
        severity: 'low',
        category: 'humanitarian',
        region: 'Nationwide',
        source: 'reliefweb',
        sourceUrl: report.fields?.url || '',
        status: 'pending'
      });
      created++;
    }

    if (created > 0) console.log(`📰 ReliefWeb: ${created} new reports fetched`);
    return created;
  } catch (error) {
    console.error('❌ ReliefWeb fetch error:', error.message);
    return 0;
  }
};

module.exports = { fetchReliefWebAlerts };
