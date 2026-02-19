const { execFileSync } = require('child_process');

function killOrphanElectronProcesses(options = {}) {
    const {
        windowsName = 'electron.exe',
        windowsCommandSubstring = 'gemini-desktop',
        posixPattern = 'electron.*gemini-desktop',
    } = options;

    try {
        if (process.platform === 'win32') {
            const psCommand =
                '$name = $args[0]; ' +
                '$substring = $args[1]; ' +
                'Get-CimInstance Win32_Process | ' +
                'Where-Object { $_.Name -eq $name -and $_.CommandLine -like ("*" + $substring + "*") } | ' +
                'ForEach-Object { taskkill /F /PID $_.ProcessId }';

            execFileSync(
                'powershell',
                ['-NoProfile', '-NonInteractive', '-Command', psCommand, windowsName, windowsCommandSubstring],
                { stdio: 'ignore' }
            );
        } else {
            execFileSync('pkill', ['-f', posixPattern], { stdio: 'ignore' });
        }
    } catch (error) {
        if (process.env.WDIO_CLEANUP_DEBUG === 'true') {
            console.warn('[WDIO cleanup] Failed to terminate orphaned processes', error);
        }
    }
}

module.exports = {
    killOrphanElectronProcesses,
};
