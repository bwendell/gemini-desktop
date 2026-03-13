/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const explicitBuildArch = process.env.npm_config_arch || process.env.BUILD_ARCH;
const buildArch = explicitBuildArch || process.arch;
const buildPlatform = process.env.BUILD_PLATFORM || process.platform;
const buildWindowsUnified = process.env.BUILD_WINDOWS_UNIFIED === 'true';
const isWindowsBuild = buildPlatform === 'win32';
const resolvedWindowsArchTargets = buildWindowsUnified ? ['x64', 'arm64'] : [buildArch === 'arm64' ? 'arm64' : 'x64'];
const windowsBinaryExclusions = buildWindowsUnified
    ? []
    : isWindowsBuild
      ? buildArch === 'arm64'
          ? [
                '!node_modules/@node-llama-cpp/win-x64',
                '!node_modules/@node-llama-cpp/win-x64-cuda',
                '!node_modules/@node-llama-cpp/win-x64-cuda-ext',
                '!node_modules/@node-llama-cpp/win-x64-vulkan',
            ]
          : ['!node_modules/@node-llama-cpp/win-arm64']
      : [
            '!node_modules/@node-llama-cpp/win-arm64',
            '!node_modules/@node-llama-cpp/win-x64',
            '!node_modules/@node-llama-cpp/win-x64-cuda',
            '!node_modules/@node-llama-cpp/win-x64-cuda-ext',
            '!node_modules/@node-llama-cpp/win-x64-vulkan',
        ];

module.exports = {
    appId: 'com.benwendell.gemini-desktop',
    productName: 'Gemini Desktop',

    // Phase A bridge release contract:
    // - promoted installer: Gemini-Desktop-${version}-installer.${ext}
    // - compatibility metadata: latest-x64.yml, latest-arm64.yml, x64.yml, arm64.yml
    // - remaining arch-scoped installers are internal-only fixtures when BUILD_WINDOWS_UNIFIED is disabled

    directories: {
        output: 'release',
        buildResources: 'build',
    },
    files: [
        'dist-electron',
        'dist',
        'package.json',
        // Exclude non-current-platform node-llama-cpp native binaries to prevent
        // bundling ~677MB of unused platform-specific .node files.
        // electron-builder resolves the correct platform binary automatically.
        '!node_modules/@node-llama-cpp/linux-x64-cuda',
        '!node_modules/@node-llama-cpp/linux-x64-cuda-ext',
        '!node_modules/@node-llama-cpp/linux-x64-vulkan',
        '!node_modules/@node-llama-cpp/linux-armv7l',
        '!node_modules/@node-llama-cpp/linux-arm64',
        '!node_modules/@node-llama-cpp/linux-x64',
        '!node_modules/@node-llama-cpp/mac-arm64-metal',
        '!node_modules/@node-llama-cpp/mac-x64',
        ...windowsBinaryExclusions,
    ],
    // Native .node binaries must be unpacked from asar for node-llama-cpp to load them
    asarUnpack: ['node_modules/@node-llama-cpp/**/*.node', 'node_modules/node-llama-cpp/**/*'],
    extraFiles: [
        {
            from: 'build',
            to: 'resources',
            filter: ['*.png', '*.ico'],
        },
    ],
    win: {
        target: [
            {
                target: 'nsis',
                arch: resolvedWindowsArchTargets,
            },
        ],
        icon: 'build/icon.png',
        artifactName: 'Gemini-Desktop-${version}-${arch}.${ext}',
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
        runAfterFinish: false,
        buildUniversalInstaller: buildWindowsUnified,
        artifactName: buildWindowsUnified
            ? 'Gemini-Desktop-${version}-installer.${ext}'
            : 'Gemini-Desktop-${version}-${arch}-installer.${ext}',
    },
    mac: {
        target: ['dmg', 'zip'],
        icon: 'build/icon.png',
        identity: null,
        artifactName: 'Gemini-Desktop-${version}-${arch}.${ext}',
        extendInfo: {
            NSMicrophoneUsageDescription: 'Gemini Desktop needs microphone access for voice input features.',
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
        artifactName: 'Gemini-Desktop-${version}-${arch}.${ext}',
        executableName: 'gemini-desktop',
    },
    deb: {
        depends: ['gconf2', 'gconf-service', 'libnotify4', 'libappindicator1', 'libxtst6', 'libnss3', 'libasound2'],
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
