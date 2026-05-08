const herokuService = require('./herokuService');
const notificationService = require('./notificationService');

const DYNO_THRESHOLD = parseInt(process.env.DYNO_THRESHOLD || '80');
const CONNECT_THRESHOLD = parseInt(process.env.CONNECT_THRESHOLD || '80');
const ADDON_THRESHOLD = parseInt(process.env.ADDON_THRESHOLD || '80');

async function checkAndNotify() {
  try {
    console.log('Checking usage thresholds...');

    const [dynos, connect, addons] = await Promise.all([
      herokuService.getDynoUsage(),
      herokuService.getConnectUsage(),
      herokuService.getAddonUsage()
    ]);

    if (parseFloat(dynos.usagePercentage) >= DYNO_THRESHOLD) {
      console.log(`Dyno usage (${dynos.usagePercentage}%) exceeds threshold (${DYNO_THRESHOLD}%)`);
      await notificationService.sendOverageAlert('Dyno Hours', dynos);
    }

    if (parseFloat(connect.usagePercentage) >= CONNECT_THRESHOLD) {
      console.log(`Connect usage (${connect.usagePercentage}%) exceeds threshold (${CONNECT_THRESHOLD}%)`);
      await notificationService.sendOverageAlert('Connect Hours', connect);
    }

    console.log('Usage check completed');

    return {
      dynos,
      connect,
      addons,
      alerts: {
        dyno: parseFloat(dynos.usagePercentage) >= DYNO_THRESHOLD,
        connect: parseFloat(connect.usagePercentage) >= CONNECT_THRESHOLD
      }
    };
  } catch (error) {
    console.error('Error in usage monitoring:', error.message);
    throw error;
  }
}

async function getDailyReport() {
  try {
    const [dynos, connect, addons] = await Promise.all([
      herokuService.getDynoUsage(),
      herokuService.getConnectUsage(),
      herokuService.getAddonUsage()
    ]);

    return { dynos, connect, addons };
  } catch (error) {
    console.error('Error generating daily report:', error.message);
    throw error;
  }
}

module.exports = {
  checkAndNotify,
  getDailyReport
};
