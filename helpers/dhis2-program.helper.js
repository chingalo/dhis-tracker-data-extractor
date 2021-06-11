const { flattenDeep, sortBy, map, join } = require('lodash');

const httpHelper = require('./http.helper');
const logsHelper = require('./logs.helper');

async function discoveringTrackerProgramsFromServer(headers, serverUrl) {
  const programs = [];
  try {
    await logsHelper.addLogs(
      'info',
      `Diacovering tracker based program list :: ${serverUrl}`,
      'discoveringTrackerProgramsFromServer'
    );
    const url = `${serverUrl}/api/programs.json?fields=id,name&paging=false&filter=programType:eq:WITH_REGISTRATION`;
    const response = await httpHelper.getHttp(headers, url);
    programs.push(response.programs || []);
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'discoveringTrackerProgram'
    );
  }
  return sortBy(flattenDeep(programs), ['name']);
}

async function discoveringTrackerProgramMetadata(headers, serverUrl, program) {
  let programMetadata = {};
  try {
    const { id: programId, name: programName } = program;
    await logsHelper.addLogs(
      'info',
      `Discovering program metadata from server :: ${programName}`
    );
    const fields = `fields=id,name,programTrackedEntityAttributes[trackedEntityAttribute[id,name,valueType,optionSet[options[code,name]]]],programStages[id,name,programStageDataElements[dataElement[id,name,valueType,optionSet[code,name]]]]`;
    const url = `${serverUrl}/api/programs/${programId}.json?${fields}`;
    const response = await httpHelper.getHttp(headers, url);
    const programTrackedEntityAttributes = flattenDeep(
      map(
        response.programTrackedEntityAttributes || [],
        (programTrackedEntityAttribute) =>
          programTrackedEntityAttribute.trackedEntityAttribute || []
      )
    );
    const programStages = flattenDeep(
      map(response.programStages || [], (programStage) => {
        const programStageDataElements = flattenDeep(
          map(
            programStage.programStageDataElements || [],
            (programStageDataElement) =>
              programStageDataElement.dataElement || []
          )
        );
        return {
          ...programStage,
          name: join(`${programStage.name}`.split('-'), ''),
          programStageDataElements,
        };
      })
    );
    programMetadata = {
      ...programMetadata,
      ...response,
      programTrackedEntityAttributes,
      programStages,
    };
  } catch (error) {
    await logsHelper.addLogs(
      'info',
      error.message || error,
      'discoveringTrackerProgramMetadata'
    );
  }
  return programMetadata;
}

module.exports = {
  discoveringTrackerProgramMetadata,
  discoveringTrackerProgramsFromServer,
};
