const { getFirebaseAdmin } = require('../config/firebase');
const User = require('../models/User');

const sendAlertNotification = async (alert) => {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.log(`📱 Push skipped (no Firebase): [${alert.severity}] ${alert.title.en}`);
    return;
  }
  try {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const alertIdx = severityLevels.indexOf(alert.severity);
    const users = await User.find({
      isActive: true, 'notificationSettings.enabled': true
    }).select('fcmTokens notificationSettings language');

    const tokens = [];
    users.forEach(u => {
      const minIdx = severityLevels.indexOf(u.notificationSettings?.minSeverity || 'medium');
      if (alertIdx >= minIdx) u.fcmTokens.forEach(t => { if (t.token) tokens.push(t.token); });
    });
    if (!tokens.length) return;

    const emoji = { low: 'ℹ️', medium: '⚠️', high: '🔴', critical: '🚨' };
    const msg = {
      notification: { title: `${emoji[alert.severity]} ${alert.title.en}`, body: `${alert.region} - ${alert.description.en}`.slice(0, 200) },
      data: { alertId: alert._id.toString(), severity: alert.severity, category: alert.category, region: alert.region },
      tokens,
      android: { priority: 'high', notification: { channelId: 'alerts', sound: 'default' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    };
    const resp = await admin.messaging().sendEachForMulticast(msg);
    console.log(`📱 Sent: ${resp.successCount} ok, ${resp.failureCount} fail`);
  } catch (e) { console.error('❌ FCM error:', e.message); }
};

module.exports = { sendAlertNotification };
