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

function Get-SubstTarget {
  param([string]$TargetDriveRoot)

  $substOutput = & subst
  foreach ($line in $substOutput) {
    if ($line -match "^\s*([A-Z]:)\\?:\s*=>\s*(.+?)\s*$") {
      $mappedDrive = $matches[1].ToUpperInvariant()
      if ($mappedDrive -eq $TargetDriveRoot.ToUpperInvariant()) {
        return $matches[2].Trim()
      }
    }
  }

  return $null
}

try {
  $existingSubstTarget = Get-SubstTarget -TargetDriveRoot $driveRoot
  if ($existingSubstTarget) {
    $message = "$driveRoot is already mapped to '$existingSubstTarget'."
    if ($existingSubstTarget.TrimEnd("\") -ieq $projectRoot.TrimEnd("\")) {
      $message += " Another Android build may be running, or a stale mapping remains."
    }
    $message += " Choose another -DriveLetter or remove the mapping manually after confirming it is unused."
    throw $message
  }

  if (Test-Path "$driveRoot\") {
    throw "$driveRoot already exists as a drive. Choose another -DriveLetter."
  }

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
    & subst $driveRoot /D
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to unmap $driveRoot after build."
    }

    $remainingSubstTarget = Get-SubstTarget -TargetDriveRoot $driveRoot
    if ($remainingSubstTarget) {
      throw "$driveRoot is still mapped to '$remainingSubstTarget' after build cleanup."
    }
  }
}
