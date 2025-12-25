/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: 'com.benwendell.gemini-desktop',
  productName: 'Gemini Desktop',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: ['dist-electron/**/*', 'dist/**/*', 'package.json'],
  extraFiles: [
    {
      from: 'build',
      to: 'resources',
      filter: ['*.png'],
    },
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
      {
        target: 'msi',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.png',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    ...(process.env.AZURE_SIGN_ENDPOINT &&
    process.env.AZURE_CODE_SIGNING_ACCOUNT_NAME &&
    process.env.AZURE_CERT_PROFILE_NAME &&
    process.env.AZURE_PUBLISHER_NAME
      ? {
          azureSignOptions: {
            endpoint: process.env.AZURE_SIGN_ENDPOINT,
            codeSigningAccountName: process.env.AZURE_CODE_SIGNING_ACCOUNT_NAME,
            certificateProfileName: process.env.AZURE_CERT_PROFILE_NAME,
            publisherName: process.env.AZURE_PUBLISHER_NAME,
          },
        }
      : {}),
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    perMachine: false,
    artifactName: '${productName}-${version}-${arch}-installer.${ext}',
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'build/icon.png',
    identity: null,
    artifactName: '${productName}-${version}-${arch}.${ext}',
    extendInfo: {
      NSMicrophoneUsageDescription:
        'Gemini Desktop needs microphone access for voice input features.',
    },
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },
  dmg: {
    sign: false,
    writeUpdateInfo: false,
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
      {
        target: 'rpm',
        arch: ['x64'],
      },
      {
        target: 'tar.gz',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.png',
    category: 'Utility',
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
  deb: {
    depends: [
      'gconf2',
      'gconf-service',
      'libnotify4',
      'libappindicator1',
      'libxtst6',
      'libnss3',
      'libasound2',
    ],
  },
  rpm: {
    depends: ['libnotify', 'libappindicator', 'libXtst', 'nss', 'alsa-lib'],
  },
  publish: {
    provider: 'github',
    releaseType: 'release',
    timeout: 600000,
  },
};
