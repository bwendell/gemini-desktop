Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,

    [Parameter(Mandatory = $true)]
    [string]$InstallDir,

    [switch]$SkipLaunch
)

if (-not (Test-Path $InstallerPath)) {
    throw "Installer not found: $InstallerPath"
}

$result = Start-Process -FilePath $InstallerPath -ArgumentList @('/S', "/D=$InstallDir") -Wait -PassThru
if ($result.ExitCode -ne 0) {
    throw "Installer exited with code $($result.ExitCode)"
}

$appExe = Join-Path $InstallDir 'Gemini Desktop.exe'
if (-not (Test-Path $appExe)) {
    throw "Installed application not found: $appExe"
}

if (-not $SkipLaunch) {
    Start-Process -FilePath $appExe | Out-Null
}

Write-Host "Installed executable: $appExe"
