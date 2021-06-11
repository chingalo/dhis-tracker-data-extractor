const app = require('./app');

const logsHelper = require('./helpers/logs.helper');

startApp();
async function startApp() {
  try {
    await logsHelper.clearLogs();
    await logsHelper.addLogs(
      'info',
      `Start of app's script process`,
      'startApp'
    );
    await app.startAppProcess();
    await logsHelper.addLogs('info', `End of app's script process`, 'startApp');
  } catch (error) {
    await logsHelper.addLogs('error', error.message || error, 'startApp');
  }
}
