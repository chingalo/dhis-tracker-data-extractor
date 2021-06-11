const { map, omit, trim, flatMapDeep, find } = require('lodash');

const logsHelper = require('./logs.helper');
const httpHelper = require('./http.helper');

async function getAllOrganisationUnitsFromServer(headers, serverUrl) {
  const allOrganisationUnits = [];
  try {
    await logsHelper.addLogs(
      'info',
      `Discovering all organisation units :: ${serverUrl}`,
      'getAllOrganisationUnitsFromServer'
    );
    const url = `${serverUrl}/api/organisationUnits.json?fields=id,name,level,ancestors[name,level]&paging=false`;
    const response = await httpHelper.getHttp(headers, url);
    allOrganisationUnits.push(
      map(response.organisationUnits || [], (location) => {
        const { level, name, ancestors } = location;
        ancestors.push({ name, level });
        return omit(
          {
            ...location,
            ancestors: map(ancestors, (ancestor) => {
              return { ...ancestor, name: trim(ancestor.name || '') };
            }),
          },
          ['level', 'name']
        );
      })
    );
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'getAllOrganisationUnitsFromServer'
    );
  }
  return flatMapDeep(allOrganisationUnits);
}

async function getOrganisationUnitNameByLevel(
  organisationUnits,
  organisationId,
  level
) {
  let organisationUnitName = '';
  try {
    const organisationObj = find(
      organisationUnits,
      (data) => data && data.id && data.id === organisationId
    );
    if (organisationObj && organisationObj.ancestors) {
      const organisation = find(
        organisationObj.ancestors || [],
        (data) => data && data.level === level
      );
      organisationUnitName = organisation
        ? organisation.name || organisationUnitName
        : organisationUnitName;
    }
  } catch (error) {
    await logsHelper.addLogs(
      'error',
      error.message || error,
      'getOrganisationUnitNameByLevel'
    );
  }
  return organisationUnitName;
}

module.exports = {
  getAllOrganisationUnitsFromServer,
  getOrganisationUnitNameByLevel,
};
