const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function isLinuxArm64() {
    return process.platform === 'linux' && process.arch === 'arm64';
}

function runOrThrow(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: 'inherit', ...options });
    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
}

function isTruthyEnv(value) {
    return /^(1|true|yes|on)$/i.test(String(value ?? ''));
}

function hasCommand(command) {
    const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
}

function findChromedriverBinary(rootDir) {
    const stack = [rootDir];

    while (stack.length > 0) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);

            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }

            if (entry.isFile() && entry.name === 'chromedriver') {
                return fullPath;
            }
        }
    }

    return null;
}

function resolveElectronVersion(projectRoot) {
    const electronPackageJsonPath = path.join(projectRoot, 'node_modules', 'electron', 'package.json');

    if (!fs.existsSync(electronPackageJsonPath)) {
        throw new Error('Electron is not installed. Run npm install first.');
    }

    const electronPackage = JSON.parse(fs.readFileSync(electronPackageJsonPath, 'utf8'));
    return electronPackage.version;
}

function resolveCacheRoot() {
    if (process.env.GEMINI_DESKTOP_CACHE_DIR) {
        return process.env.GEMINI_DESKTOP_CACHE_DIR;
    }

    if (process.env.XDG_CACHE_HOME) {
        return path.join(process.env.XDG_CACHE_HOME, 'gemini-desktop');
    }

    return path.join(os.homedir(), '.cache', 'gemini-desktop');
}

function resolveArmChromedriver(projectRoot) {
    const electronVersion = resolveElectronVersion(projectRoot);
    const cacheDir = path.join(resolveCacheRoot(), 'chromedriver', `electron-v${electronVersion}-linux-arm64`);
    const zipPath = path.join(cacheDir, `chromedriver-v${electronVersion}-linux-arm64.zip`);
    const extractDir = path.join(cacheDir, 'extract');

    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });

    const cachedBinary = findChromedriverBinary(extractDir);
    if (cachedBinary && fs.existsSync(cachedBinary)) {
        fs.chmodSync(cachedBinary, 0o755);
        return cachedBinary;
    }

    const downloadUrl = `https://github.com/electron/electron/releases/download/v${electronVersion}/chromedriver-v${electronVersion}-linux-arm64.zip`;
    console.log(`[wdio-arm-env] Downloading ARM64 Chromedriver for Electron v${electronVersion}`);
    if (hasCommand('curl')) {
        runOrThrow('curl', ['-fL', downloadUrl, '-o', zipPath]);
    } else if (hasCommand('wget')) {
        runOrThrow('wget', ['-O', zipPath, downloadUrl]);
    } else {
        throw new Error('Neither curl nor wget is available. Install one to download ARM Chromedriver.');
    }

    console.log('[wdio-arm-env] Extracting Chromedriver archive');
    if (hasCommand('unzip')) {
        runOrThrow('unzip', ['-o', zipPath, '-d', extractDir]);
    } else if (hasCommand('python3')) {
        const pythonScript = [
            'import pathlib, zipfile',
            `zip_path = pathlib.Path(${JSON.stringify(zipPath)})`,
            `extract_dir = pathlib.Path(${JSON.stringify(extractDir)})`,
            'extract_dir.mkdir(parents=True, exist_ok=True)',
            "with zipfile.ZipFile(zip_path, 'r') as zf:",
            '    zf.extractall(extract_dir)',
        ].join('\n');
        runOrThrow('python3', ['-c', pythonScript]);
    } else {
        throw new Error('Neither unzip nor python3 is available. Install one to extract ARM Chromedriver archive.');
    }

    const extractedBinary = findChromedriverBinary(extractDir);
    if (!extractedBinary) {
        throw new Error(`Chromedriver binary not found after extraction in ${extractDir}`);
    }

    fs.chmodSync(extractedBinary, 0o755);
    return extractedBinary;
}

function applyArmWdioEnvironment(projectRoot) {
    if (!isLinuxArm64()) {
        return;
    }

    if (!process.env.CI && !process.env.DISPLAY) {
        process.env.CI = 'true';
        console.log('[wdio-arm-env] Headless Linux ARM detected, forcing CI=true for WDIO autoXvfb');
    }

    const skipBuildWasExplicitlySet = typeof process.env.SKIP_BUILD === 'string' && process.env.SKIP_BUILD.length > 0;

    if (!skipBuildWasExplicitlySet) {
        const hasOptionalLlamaModule = fs.existsSync(path.join(projectRoot, 'node_modules', 'node-llama-cpp'));
        const hasCompiledElectron = fs.existsSync(path.join(projectRoot, 'dist-electron', 'main', 'main.cjs'));

        if (!hasOptionalLlamaModule && hasCompiledElectron) {
            process.env.SKIP_BUILD = 'true';
            console.log('[wdio-arm-env] node-llama-cpp missing; using existing dist-electron with SKIP_BUILD=true');
        }
    }

    if (!process.env.CHROMEDRIVER_PATH) {
        const chromedriverBinary = resolveArmChromedriver(projectRoot);
        process.env.CHROMEDRIVER_PATH = chromedriverBinary;
        console.log(`[wdio-arm-env] Using ARM Chromedriver at ${chromedriverBinary}`);
    }
}

module.exports = {
    applyArmWdioEnvironment,
    isTruthyEnv,
    resolveArmChromedriver,
};
