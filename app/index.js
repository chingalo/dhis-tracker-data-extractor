const { sortBy, take, map, join, flattenDeep, uniq } = require('lodash');

const { sourceConfig, organisationUnitColumnConfigs } = require('../configs');

const logsHelper = require('../helpers/logs.helper');
const dhis2UtilHelper = require('../helpers/dhis2-util.helper');
const dhis2organisationUnitHelper = require('../helpers/dhis2-organisation-unit.helper');

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
    const organisationUnits =
      await dhis2organisationUnitHelper.getAllOrganisationUnitsFromServer(
        headers,
        serverUrl
      );
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
