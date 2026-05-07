const cron = require('node-cron');
const { pollTelegramUpdates } = require('./telegramService');
const { fetchReliefWebAlerts } = require('./reliefwebService');

const startAggregator = () => {
  console.log('🔄 Alert aggregator started');

  // Poll Telegram every 30 seconds
  if (process.env.TELEGRAM_BOT_TOKEN) {
    cron.schedule('*/30 * * * * *', async () => {
      await pollTelegramUpdates();
    });
    console.log('   📨 Telegram polling: every 30s');
  }

  // Fetch ReliefWeb every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await fetchReliefWebAlerts();
  });
  console.log('   📰 ReliefWeb polling: every 15min');

  // Initial fetch
  setTimeout(async () => {
    await fetchReliefWebAlerts();
    if (process.env.TELEGRAM_BOT_TOKEN) await pollTelegramUpdates();
  }, 5000);
};

module.exports = { startAggregator };
