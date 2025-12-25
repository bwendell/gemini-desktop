/**
 * Cleanup script for Gemini Desktop.
 * Removes build artifacts, caches, and logs.
 * Kills lingering Electron/ChromeDriver processes.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dirs = [
  'dist',
  'dist-electron',
  'release',
  'coverage',
  'coverage-electron',
  'test-results',
  '.wdio-test-data',
  'node_modules/.cache',
  'node_modules/.vite',
];

const logs = [
  'debug_hotkey.log',
  'error.log',
  'hotkey_tap.log',
  'hotkey_verbose.log',
  'tray_tap.log',
  'e2e_output.txt',
  'vite_log.txt',
];

console.log('--- Repository Cleanup Started ---');

// 1. Kill lingering processes
console.log('\nKilling lingering processes...');
try {
  if (process.platform === 'win32') {
    // Windows
    try {
      execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
    } catch (e) {}
    try {
      execSync('taskkill /F /IM chromedriver.exe /T', { stdio: 'ignore' });
    } catch (e) {}
    console.log('Processes terminated (Windows)');
  } else {
    // macOS / Linux
    try {
      execSync('pkill -f electron', { stdio: 'ignore' });
    } catch (e) {}
    try {
      execSync('pkill -f chromedriver', { stdio: 'ignore' });
    } catch (e) {}
    console.log('Processes terminated (Unix)');
  }
} catch (e) {
  console.log('No processes to terminate.');
}

// 2. Remove directories
console.log('\nCleaning directories...');
dirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  [CLEANED] ${dir}`);
    } catch (error) {
      console.error(`  [FAILED]  ${dir}: ${error.message}`);
    }
  }
});

// 3. Remove log files
console.log('\nRemoving log files...');
logs.forEach((log) => {
  const fullPath = path.join(process.cwd(), log);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`  [REMOVED] ${log}`);
    } catch (error) {
      console.error(`  [FAILED]  ${log}: ${error.message}`);
    }
  }
});

console.log('\n--- Cleanup Complete ---');
