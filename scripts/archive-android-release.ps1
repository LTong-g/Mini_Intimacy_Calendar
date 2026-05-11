param(
  [string]$ApkPath = ".\android\app\build\outputs\apk\release\app-release.apk",
  [string]$DistDir = ".\dist",
  [string]$AppName = "Mini_Intimacy_Calendar",
  [switch]$AllowOverwrite
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")).Path
$resolvedApk = Resolve-Path -LiteralPath (Join-Path $projectRoot $ApkPath)
$apkFullPath = $resolvedApk.Path

if ($apkFullPath -match "\\debug\\|/debug/|app-debug\.apk$") {
  throw "Refusing to archive a debug APK: $apkFullPath"
}

$packageJsonPath = Join-Path $projectRoot "package.json"
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$packageJson.version

if ([string]::IsNullOrWhiteSpace($version)) {
  throw "package.json version is empty."
}

$distFullPath = Join-Path $projectRoot $DistDir
if (-not (Test-Path -LiteralPath $distFullPath)) {
  New-Item -ItemType Directory -Path $distFullPath | Out-Null
}

$dateStamp = Get-Date -Format "yyyyMMdd"
$archiveName = "$AppName-v$version-android-$dateStamp.apk"
$archivePath = Join-Path $distFullPath $archiveName

if ((Test-Path -LiteralPath $archivePath) -and -not $AllowOverwrite) {
  throw "Release archive already exists: $archivePath. Archived versions must not be overwritten without explicit approval."
}

Copy-Item -LiteralPath $apkFullPath -Destination $archivePath -Force:$AllowOverwrite

$archive = Get-Item -LiteralPath $archivePath
Write-Output "Archived release APK: $($archive.FullName)"
Write-Output "Size: $($archive.Length) bytes ($([math]::Round($archive.Length / 1MB, 2)) MB)"
