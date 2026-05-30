// Config plugin: set the iOS development team + automatic signing on every
// prebuild, so device builds are repeatable from a clean checkout (no manual
// pbxproj edits). The team id is not a secret — it's the same one committed in
// the SwiftUI app's project.yml.
const { withXcodeProject } = require('@expo/config-plugins');

const DEVELOPMENT_TEAM = 'LT3456KW44';

module.exports = function withIosSigning(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(buildConfigs)) {
      const entry = buildConfigs[key];
      const settings = entry && entry.buildSettings;
      // Only the app target's configs carry a bundle identifier.
      if (settings && settings.PRODUCT_BUNDLE_IDENTIFIER) {
        settings.DEVELOPMENT_TEAM = DEVELOPMENT_TEAM;
        settings.CODE_SIGN_STYLE = 'Automatic';
      }
    }
    return cfg;
  });
};
