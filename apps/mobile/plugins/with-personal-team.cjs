const { withEntitlementsPlist } = require('expo/config-plugins');

// Keep the notification plugin's other native setup, but remove the entitlement
// that Apple's free provisioning profiles cannot sign.
module.exports = function withPersonalTeam(config) {
  return withEntitlementsPlist(config, config => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
