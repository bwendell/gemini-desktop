const { execSync } = require('child_process');

function killOrphanElectronProcesses(options = {}) {
    const {
        windowsName = 'electron.exe',
        windowsCommandSubstring = 'gemini-desktop',
        posixPattern = 'electron.*gemini-desktop',
    } = options;

    try {
        if (process.platform === 'win32') {
            const escapedWindowsName = windowsName.replace(/'/g, "''");
            const escapedCommandSubstring = windowsCommandSubstring.replace(/'/g, "''");
            const psCommand =
                'powershell -Command "' +
                "Get-CimInstance Win32_Process | " +
                `Where-Object { $_.Name -eq '${escapedWindowsName}' -and $_.CommandLine -like '*${escapedCommandSubstring}*' } | ` +
                "ForEach-Object { taskkill /F /PID $_.ProcessId }\"";

            execSync(psCommand, { stdio: 'ignore' });
        } else {
            const escapedPosixPattern = posixPattern.replace(/"/g, '\\"');
            execSync(`pkill -f "${escapedPosixPattern}"`, { stdio: 'ignore' });
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
