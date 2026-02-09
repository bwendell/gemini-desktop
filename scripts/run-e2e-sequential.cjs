const { spawnSync, execSync } = require('child_process');

function killOrphanElectronProcesses() {
    try {
        if (process.platform === 'win32') {
            // Use taskkill instead of deprecated wmic
            // /F forces termination, /FI filters to electron.exe processes
            // PowerShell filter ensures we only kill gemini-desktop electron processes
            execSync(
                'powershell -Command "Get-Process | Where-Object { $_.ProcessName -eq \'electron\' -and $_.CommandLine -like \'*gemini-desktop*\' } | ForEach-Object { taskkill /F /PID $_.Id }"',
                {
                    stdio: 'ignore',
                }
            );
        } else {
            // Scope to electron processes running gemini-desktop only
            execSync('pkill -f "electron.*gemini-desktop"', { stdio: 'ignore' });
        }
    } catch (_) {
        // Process might already be gone, or no matching processes found (exit code 1)
    }
}

const specs = [
    'tests/e2e/app-startup.spec.ts',
    'tests/e2e/menu_bar.spec.ts',
    'tests/e2e/hotkeys.spec.ts',
    'tests/e2e/options-window.spec.ts',
    'tests/e2e/menu-interactions.spec.ts',
    'tests/e2e/theme.spec.ts',
    'tests/e2e/theme-selector-visual.spec.ts',
    'tests/e2e/theme-selector-keyboard.spec.ts',
    'tests/e2e/external-links.spec.ts',
    'tests/e2e/quick-chat.spec.ts',
    'tests/e2e/auth.spec.ts',
    'tests/e2e/macos-dock.spec.ts',
    'tests/e2e/window-controls.spec.ts',
];

console.log('Building app once for all tests...');
const buildResult = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (buildResult.status !== 0) {
    console.error('Frontend build failed');
    process.exit(1);
}

const buildElectronResult = spawnSync('npm', ['run', 'build:electron'], {
    stdio: 'inherit',
    shell: true,
});
if (buildElectronResult.status !== 0) {
    console.error('Electron build failed');
    process.exit(1);
}

// Set SKIP_BUILD to true for individual test runs to avoid rebuilding/relaunching excessive processes
process.env.SKIP_BUILD = 'true';

console.log('Starting Sequential E2E Tests...');

let failed = false;

for (const spec of specs) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`Running spec: ${spec}`);
    console.log(`---------------------------------------------------------\n`);

    const result = spawnSync('npx', ['wdio', 'run', 'config/wdio/wdio.conf.js', '--spec', spec], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd(),
    });

    if (result.status !== 0) {
        console.error(`\n❌ Spec failed: ${spec}`);
        failed = true;
        killOrphanElectronProcesses();
        break; // Stop on first failure
    }

    killOrphanElectronProcesses();
}

if (failed) {
    console.error('\n❌ E2E Tests Failed.');
    process.exit(1);
} else {
    console.log('\n✅ All E2E Tests Passed.');
    process.exit(0);
}
