const {
  sortBy,
  take,
  map,
  join,
  flattenDeep,
  uniq,
  groupBy,
  keys,
  split,
} = require('lodash');

const { sourceConfig, organisationUnitColumnConfigs } = require('../configs');

const logsHelper = require('../helpers/logs.helper');
const dhis2UtilHelper = require('../helpers/dhis2-util.helper');
const dhis2organisationUnitHelper = require('../helpers/dhis2-organisation-unit.helper');
const dhis2ProgramHelper = require('../helpers/dhis2-program.helper');
const dhis2TrackerCaptureDataHelper = require('../helpers/dhis2-tracker-capture-data-helper');
const dhis2TrackerExcelFileHelper = require('../helpers/dhis2-tracker-excel-file-helper');
const excelFileUtilHelper = require('../helpers/excel-file-util.helper');
const fileManipulationHelper = require('../helpers/file-manipulation.helper');

async function startAppProcess() {
  try {
    const folderPath = `${fileManipulationHelper.fileDir}/raw-data`;
    await fileManipulationHelper.intiateFilesDirectories(folderPath);
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
    for (const program of programs) {
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
        if (excelJsonData.length > 0) {
          await logsHelper.addLogs(
            'info',
            `Generating excel files for program :: ${program.name}`,
            'startAppProcess'
          );
          const groupedData = groupBy(excelJsonData, groupByKey);
          for (const groupKey of keys(groupedData)) {
            const date = dhis2UtilHelper.getFormattedDate(new Date());
            const programName = join(split(`${program.name}`, '/'), '_');
            const fileName = `[${groupKey}]${programName} ${date}.xlsx`;
            const excelFilePath = `${folderPath}/${fileName}`;
            await excelFileUtilHelper.writeToMultipleSheetExcelFile(
              { list: groupedData[groupKey] },
              excelFilePath
            );
          }
        }
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
