const { spawnSync } = require('child_process');
const os = require('os');

// Define all groups
const groups = [
  'startup',
  'window',
  'menu',
  'hotkeys',
  'quickchat',
  'options',
  'theme',
  'auth',
  'tray',
  'update',
  'stability',
  // 'macos' - exclude mainly because we are likely on Windows/Linux for this run, check below
];

const platform = os.platform();
if (platform === 'darwin') {
  groups.push('macos');
}

console.log('Building app once for all tests...');
// Build once
const buildResult = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (buildResult.status !== 0) {
    console.error('Frontend build failed');
    process.exit(1);
}

const buildElectronResult = spawnSync('npm', ['run', 'build:electron'], { stdio: 'inherit', shell: true });
if (buildElectronResult.status !== 0) {
    console.error('Electron build failed');
    process.exit(1);
}

// Set SKIP_BUILD to true for individual test runs
process.env.SKIP_BUILD = 'true';

const results = [];

console.log(`\nStarting execution of ${groups.length} test groups...\n`);

for (const group of groups) {
  console.log(`\n=========================================================`);
  console.log(`Running group: ${group}`);
  console.log(`=========================================================\n`);

  const startTime = Date.now();
  const result = spawnSync('npm', ['run', `test:e2e:group:${group}`], {
    stdio: 'inherit',
    shell: true,
  });
  const duration = (Date.now() - startTime) / 1000;

  const passed = result.status === 0;
  results.push({ group, passed, duration });
  
  if (!passed) {
      console.error(`\n❌ Group '${group}' FAILED`);
  } else {
      console.log(`\n✅ Group '${group}' PASSED`);
  }
}

console.log('\n\n=========================================================');
console.log('TEST RESULTS SUMMARY');
console.log('=========================================================');

let failedCount = 0;

results.forEach(({ group, passed, duration }) => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  if (!passed) failedCount++;
  console.log(`${status} - ${group} (${duration.toFixed(1)}s)`);
});

console.log('=========================================================');

if (failedCount > 0) {
  console.log(`\n❌ ${failedCount} groups failed.`);
  process.exit(1);
} else {
  console.log('\n✅ All groups passed!');
  process.exit(0);
}
