param(
    [Parameter(Mandatory = $true)]
    [string]$ReleaseDir,

    [Parameter(Mandatory = $true)]
    [string]$InstallRoot,

    [Parameter(Mandatory = $true)]
    [string]$ResultPath,

    [string]$InstallerPath = ''
)

$ErrorActionPreference = 'Stop'

function Get-PromotedInstallerPath {
    param(
        [string]$ManifestPath,
        [string]$FallbackReleaseDir
    )

    $manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
    return Join-Path $FallbackReleaseDir $manifest.promotedInstallerName
}

$manifestPath = Join-Path $ReleaseDir 'windows-release-manifest.json'
$resolvedInstallerPath = if ([string]::IsNullOrWhiteSpace($InstallerPath)) {
    Get-PromotedInstallerPath -ManifestPath $manifestPath -FallbackReleaseDir $ReleaseDir
} else {
    $InstallerPath
}

$searchedPaths = @(
    (Join-Path $InstallRoot 'Gemini Desktop.exe'),
    (Join-Path $InstallRoot 'Gemini Desktop\Gemini Desktop.exe'),
    (Join-Path $InstallRoot 'resources\Gemini Desktop.exe')
)

$uninstallSearchPaths = @(
    (Join-Path $InstallRoot 'Uninstall Gemini Desktop.exe'),
    (Join-Path $InstallRoot 'Uninstall.exe'),
    (Join-Path $InstallRoot 'unins000.exe')
)

$cleanupOnFailure = $true
$installerExitCode = $null

try {
    if (Test-Path $InstallRoot) {
        Remove-Item -Path $InstallRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
    New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($ResultPath)) -Force | Out-Null

    $process = Start-Process -FilePath $resolvedInstallerPath -ArgumentList @('/S', "/D=$InstallRoot") -Wait -PassThru
    $installerExitCode = $process.ExitCode

    if ($installerExitCode -ne 0) {
        throw "Installer exited with code $installerExitCode"
    }

    $installedExePath = $searchedPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $installedExePath) {
        throw 'Unable to locate installed Gemini Desktop executable after silent install.'
    }

    $uninstallPath = $uninstallSearchPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    $result = [ordered]@{
        installerPath = $resolvedInstallerPath
        installedExePath = $installedExePath
        uninstallPath = $uninstallPath
        installerExitCode = $installerExitCode
        searchedPaths = $searchedPaths
        uninstallSearchedPaths = $uninstallSearchPaths
        installRoot = $InstallRoot
    }

    $result | ConvertTo-Json -Depth 5 | Set-Content -Path $ResultPath -Encoding UTF8
    $cleanupOnFailure = $false
}
catch {
    $failureResult = [ordered]@{
        installerPath = $resolvedInstallerPath
        installedExePath = $null
        uninstallPath = $null
        installerExitCode = $installerExitCode
        searchedPaths = $searchedPaths
        uninstallSearchedPaths = $uninstallSearchPaths
        installRoot = $InstallRoot
        error = $_.Exception.Message
    }

    $failureResult | ConvertTo-Json -Depth 5 | Set-Content -Path $ResultPath -Encoding UTF8
    throw
}
finally {
    if ($cleanupOnFailure -and (Test-Path $InstallRoot)) {
        Remove-Item -Path $InstallRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
