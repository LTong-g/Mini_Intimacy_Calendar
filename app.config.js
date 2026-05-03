const pkg = require('./package.json');

module.exports = ({ config }) => {
  const base = config || {};
  const version = pkg.version;

  return {
    ...base,
    version,
    ios: {
      ...(base.ios || {}),
      runtimeVersion: version,
    },
    android: {
      ...(base.android || {}),
      runtimeVersion: version,
    },
  };
};
