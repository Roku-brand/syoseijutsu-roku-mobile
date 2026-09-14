// app.json remains the Web baseline; identifiers require owner configuration.
module.exports = ({ config }) => {
  const bundleId = process.env.IOS_BUNDLE_IDENTIFIER;
  const projectId = process.env.EAS_PROJECT_ID || '2f3b738f-15ba-4689-ae0c-5c53cfebf853';
  if (process.env.EAS_BUILD_PLATFORM === 'ios' && (!bundleId || !projectId || !process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID)) {
    throw new Error('Set IOS_BUNDLE_IDENTIFIER, EAS_PROJECT_ID and EXPO_PUBLIC_APPLE_PRODUCT_ID before EAS iOS build.');
  }
  return { ...config,
    owner: config.owner || 'shoseijutsuroku',
    plugins: [...(config.plugins || []).map(plugin => Array.isArray(plugin) && plugin[0] === 'expo-image-picker'
      ? [plugin[0], { ...plugin[1], cameraPermission: false, microphonePermission: false }] : plugin), 'expo-iap'],
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
    ios: { ...config.ios, ...(bundleId ? { bundleIdentifier: bundleId } : {}),
      infoPlist: { ...config.ios?.infoPlist, NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        ...(process.env.EAS_BUILD_PROFILE === 'development' ? { NSAllowsLocalNetworking: true } : {}),
      } },
      privacyManifests: { ...config.ios?.privacyManifests, NSPrivacyTracking: false,
        NSPrivacyCollectedDataTypes: [
          ['EmailAddress', ['AppFunctionality']], ['Name', ['AppFunctionality']],
          ['UserID', ['AppFunctionality', 'Analytics']], ['DeviceID', ['Analytics']], ['PhotosorVideos', ['AppFunctionality']],
          ['PurchaseHistory', ['AppFunctionality']], ['ProductInteraction', ['Analytics', 'ProductPersonalization']],
        ].map(([type, purposes]) => ({ NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
          NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: purposes.map(p => `NSPrivacyCollectedDataTypePurpose${p}`) })),
      },
    },
  };
};
