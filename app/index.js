const { sortBy, take, map, join, flattenDeep, uniq } = require('lodash');

const { sourceConfig, organisationUnitColumnConfigs } = require('../configs');

const logsHelper = require('../helpers/logs.helper');
const dhis2UtilHelper = require('../helpers/dhis2-util.helper');

async function startAppProcess() {
  try {
    const groupByKey = getGroupByKey();
    const locationColumnConfigs = sortBy(organisationUnitColumnConfigs, [
      'level',
    ]);
    const { username, password, url: serverUrl } = sourceConfig;
    const headers = dhis2UtilHelper.getHttpAuthorizationHeader(
      username,
      password
    );
    console.log({
      og: organisationUnitColumnConfigs,
      groupByKey,
      locationColumnConfigs,
      serverUrl,
      headers,
    });
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'startAppProcess'
    );
  }
}

function getGroupByKey() {
  return join(
    uniq(
      flattenDeep(
        map(
          take(sortBy(organisationUnitColumnConfigs, ['level']), 1),
          (data) => data.columnName || []
        )
      )
    )
  );
}

module.exports = {
  startAppProcess,
};
