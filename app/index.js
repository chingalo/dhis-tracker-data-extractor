const { sortBy, take, map, join, flattenDeep, uniq } = require('lodash');

const { sourceConfig, organisationUnitColumnConfigs } = require('../configs');

const logsHelper = require('../helpers/logs.helper');
const dhis2UtilHelper = require('../helpers/dhis2-util.helper');
const dhis2organisationUnitHelper = require('../helpers/dhis2-organisation-unit.helper');
const dhis2ProgramHelper = require('../helpers/dhis2-program.helper');
const dhis2TrackerCaptureDataHelper = require('../helpers/dhis2-tracker-capture-data-helper');
const dhis2TrackerExcelFileHelper = require('../helpers/dhis2-tracker-excel-file-helper');

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
    const programs =
      await dhis2ProgramHelper.discoveringTrackerProgramsFromServer(
        headers,
        serverUrl
      );
    for (const program of [programs[0]]) {
      const batchSize = 500;
      const programMetadata =
        await dhis2ProgramHelper.discoveringTrackerProgramMetadata(
          headers,
          serverUrl,
          program
        );
      const trackerCaptureData =
        await dhis2TrackerCaptureDataHelper.getTrackerCaptureDataFromServer(
          headers,
          serverUrl,
          program.id,
          batchSize
        );
      if (trackerCaptureData.length > 0) {
        const excelJsonData =
          await dhis2TrackerExcelFileHelper.getExcelJsonData(
            organisationUnits,
            locationColumnConfigs,
            trackerCaptureData,
            programMetadata,
            program.id
          );
        if (excelJsonData.length > 0)
          console.log(JSON.stringify(excelJsonData));
      }
    }
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
