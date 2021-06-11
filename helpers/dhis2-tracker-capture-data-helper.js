const { flattenDeep, uniq, map, find } = require('lodash');

const httpHelper = require('./http.helper');
const logsHelper = require('./logs.helper');
const dhis2UtilHelper = require('./dhis2-util.helper');

async function getTrackerCaptureDataFromServer(
  headers,
  serverUrl,
  programId,
  batchSize = 100
) {
  const trackerCaptureData = [];
  const filters = `ouMode=ALL&program=${programId}`;
  const fields = `fields=trackedEntityInstance,trackedEntityType,orgUnit,attributes[attribute,value],enrollments[program,orgUnit,status,trackedEntityInstance,enrollment,trackedEntityType,incidentDate,enrollmentDate,events[event,eventDate,status,orgUnit,program,programStage,trackedEntityInstance,dataValues[dataElement,value]]],relationships[relationshipType,relationship,from[trackedEntityInstance[trackedEntityInstance]],to[trackedEntityInstance[trackedEntityInstance]]]`;
  try {
    const url = `${serverUrl}/api/trackedEntityInstances.json`;
    await logsHelper.addLogs(
      'info',
      `Discovering pagination for tracker data for programid ${programId} with batch size ${batchSize}`,
      'getTrackerDataFromServer'
    );
    const paginationFilters =
      await dhis2UtilHelper.getDhis2ResourcePaginationFromServer(
        headers,
        url,
        batchSize,
        filters
      );
    let count = 0;
    for (const paginationFilter of paginationFilters) {
      count++;
      await logsHelper.addLogs(
        'info',
        `Discovering tracker data for programid ${programId} :: ${count}/${paginationFilters.length}`,
        'getTrackerDataFromServer'
      );
      const trackerDataUrl = `${url}?${filters}&${fields}&${paginationFilter}`;
      const response = await httpHelper.getHttp(headers, trackerDataUrl);
      const trackedEntityInstances = response.trackedEntityInstances || [];
      trackerCaptureData.push(trackedEntityInstances);
    }
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'getTrackerDataFromServer'
    );
  }
  return flattenDeep(trackerCaptureData);
}

function getProgramStageIdsFromEvents(trackerData) {
  return uniq(
    flattenDeep(
      map(
        flattenDeep(
          map(trackerData, (tei) => {
            return map(
              tei.enrollments || [],
              (enrollment) => enrollment.events || []
            );
          })
        ),
        (event) => event.programStage || []
      )
    )
  );
}

function getEnrollmentDateFromTeiEnrollments(enrollments, programId = '') {
  let enrollmentDate = '';
  try {
    const enrollmentObj = find(
      enrollments || [],
      (enrollment) =>
        enrollment && enrollment.program && enrollment.program === programId
    );
    enrollmentDate =
      enrollmentObj && enrollmentObj.enrollmentDate
        ? dhis2UtilHelper.getFormattedDate(enrollmentObj.enrollmentDate)
        : enrollmentDate;
  } catch (error) {}
  return enrollmentDate;
}

function getTeiEventsFromTeiEnrollments(enrollments, programId = '') {
  return flattenDeep(
    map(
      filter(
        enrollments || [],
        (enrollment) =>
          enrollment && enrollment.program && enrollment.program === programId
      ),
      (enrollment) => enrollment.events || []
    )
  );
}

module.exports = {
  getProgramStageIdsFromEvents,
  getEnrollmentDateFromTeiEnrollments,
  getTeiEventsFromTeiEnrollments,
  getTrackerCaptureDataFromServer,
};
