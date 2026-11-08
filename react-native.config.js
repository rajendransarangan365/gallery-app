module.exports = {
  project: {
    android: {
      sourceDir: './apps/android/android',
    },
  },
  dependencies: {
    expo: {
      platforms: {
        android: {
          packageImportPath: 'import expo.modules.ExpoModulesPackage;',
          packageInstance: 'new ExpoModulesPackage()',
        },
      },
    },
  },
};

