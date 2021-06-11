const { sourceServer } = require('./server-config');

module.exports = {
  sourceConfig: sourceServer,
  organisationUnitColumnConfigs: [
    { level: 4, columnName: 'Facility' },
    { level: 2, columnName: 'District' },
    { level: 3, columnName: 'Community Council' },
  ],
};
