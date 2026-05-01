param(
  [string]$DriveLetter = "M",
  [string]$GradleTask = "assembleDebug",
  [string]$NodeEnv = "development"
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path
$drive = ($DriveLetter.TrimEnd(":")).ToUpperInvariant()

if ($drive -notmatch "^[A-Z]$") {
  throw "DriveLetter must be a single letter, got: $DriveLetter"
}

$driveRoot = "$drive`:"
$mapped = $false

try {
  # Recreate mapping every build to avoid stale path roots in caches.
  & subst $driveRoot /D 2>$null | Out-Null
  & subst $driveRoot $projectRoot

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to map $driveRoot to $projectRoot"
  }

  $mapped = $true

  $androidDir = "$driveRoot\android"
  $gradlew = "$androidDir\gradlew.bat"

  if (-not (Test-Path $gradlew)) {
    throw "gradlew.bat not found: $gradlew"
  }

  $env:NODE_ENV = $NodeEnv

  Push-Location $androidDir
  try {
    & .\gradlew.bat $GradleTask
    $exitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }

  if ($exitCode -ne 0) {
    exit $exitCode
  }
}
finally {
  if ($mapped) {
    & subst $driveRoot /D 2>$null | Out-Null
  }
}
