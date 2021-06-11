const { find, filter, flattenDeep, sortBy, uniq, map } = require('lodash');

const dhis2TrackerCaptureDataHelper = require('./dhis2-tracker-capture-data-helper');
const dhis2UtilHelper = require('./dhis2-util.helper');
const logsHelper = require('../helpers/logs.helper');
const dhis2organisationUnitHelper = require('../helpers/dhis2-organisation-unit.helper');

async function getExcelJsonData(
  organisationUnits,
  locationColumnConfigs,
  trackerData,
  trackerMetadata,
  programId
) {
  const excelJsonData = [];
  try {
    await logsHelper.addLogs(
      'info',
      `Generate excel file JSON data for programId : ${programId}`,
      'getExcelJsonData'
    );
    const programStageIds =
      dhis2TrackerCaptureDataHelper.getProgramStageIdsFromEvents(trackerData);
    for (const tei of trackerData) {
      const profileData = {};
      const enrollmentDate =
        dhis2TrackerCaptureDataHelper.getEnrollmentDateFromTeiEnrollments(
          tei.enrollments,
          programId
        );
      const teiEvents =
        dhis2TrackerCaptureDataHelper.getTeiEventsFromTeiEnrollments(
          tei.enrollments,
          programId
        );
      profileData['DHIS2 ID'] = tei.trackedEntityInstance;
      for (locationColumnConfig of locationColumnConfigs) {
        if (locationColumnConfig.columnName && locationColumnConfig.level) {
          profileData[locationColumnConfig.columnName] =
            await dhis2organisationUnitHelper.getOrganisationUnitNameByLevel(
              organisationUnits,
              tei.orgUnit,
              locationColumnConfig.level
            );
        }
      }
      profileData['Enrollment Date'] = enrollmentDate;
      for (const attributeData of tei.attributes) {
        const attributeObj = find(
          trackerMetadata.programTrackedEntityAttributes || [],
          (programTrackedEntityAttribute) =>
            attributeData.attribute &&
            programTrackedEntityAttribute &&
            programTrackedEntityAttribute.id &&
            programTrackedEntityAttribute.id === attributeData.attribute
        );
        if (attributeObj) {
          const { optionSet, valueType } = attributeObj;
          const options =
            optionSet && optionSet.options ? optionSet.options : [];
          profileData[attributeObj.name] = getSanitizedDhis2Value(
            attributeData.value || '',
            valueType,
            options
          );
        }
      }
      if (teiEvents.length === 0) {
        excelJsonData.push(profileData);
      }
      for (const programStage of filter(
        trackerMetadata.programStages || [],
        (programStageObj) =>
          programStageObj &&
          programStageObj.id &&
          programStageIds.includes(programStageObj.id)
      )) {
        const programStageEvents = filter(
          teiEvents,
          (event) =>
            event.programStage && event.programStage === programStage.id
        );
        if (programStageEvents.length > 0) {
          for (const programStageEvent of programStageEvents) {
            const eventDate = dhis2UtilHelper.getFormattedDate(
              programStageEvent.eventDate
            );
            const programStageData = {};
            const eventDatelabel = `${programStage.name}_Event date`;
            programStageData[eventDatelabel] = eventDate;
            for (const dataValue of programStageEvent.dataValues || []) {
              const dataElementObj = find(
                programStage.programStageDataElements || [],
                (programStageDataElement) =>
                  dataValue.dataElement &&
                  programStageDataElement.id &&
                  programStageDataElement.id === dataValue.dataElement
              );
              if (dataElementObj) {
                const { optionSet, valueType } = dataElementObj;
                const options =
                  optionSet && optionSet.options ? optionSet.options : [];
                const dataElementLabel = `${programStage.name}_${dataElementObj.name}`;
                programStageData[dataElementLabel] = getSanitizedDhis2Value(
                  dataValue.value || '',
                  valueType,
                  options
                );
              }
            }
            excelJsonData.push({ ...profileData, ...programStageData });
          }
        }
      }
    }
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'getExcelJsonData'
    );
  }
  return sortBy(
    flattenDeep(excelJsonData),
    uniq(
      flattenDeep(
        map(locationColumnConfigs, (config) => config.columnName || [])
      )
    )
  );
}

function getSanitizedDhis2Value(dhis2Value, valueType, options) {
  if (options.length > 0) {
    const selectedOption = find(
      options,
      (optionObj) =>
        optionObj && optionObj.code && optionObj.code === dhis2Value
    );
    dhis2Value =
      selectedOption && selectedOption.name ? selectedOption.name : dhis2Value;
  } else if (valueType === 'TRUE_ONLY') {
    dhis2Value = `${dhis2Value}` === 'true' ? 'Yes' : '';
  } else if (valueType === 'BOOLEAN') {
    dhis2Value = `${dhis2Value}` === 'true' ? 'Yes' : 'No';
  }
  return dhis2Value;
}

module.exports = {
  getExcelJsonData,
};
