param(
  [Parameter(Mandatory = $true)]
  [string]$SectionTitle,

  [Parameter(Mandatory = $true)]
  [string[]]$Facts,

  [string]$LogPath = ".\develop_log.md",

  [switch]$SkipHeuristicCheck,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $LogPath)) {
  throw "Log file not found: $LogPath"
}

$cleanTitle = $SectionTitle.Trim()
if ([string]::IsNullOrWhiteSpace($cleanTitle)) {
  throw "SectionTitle cannot be empty."
}

$normalizedFacts = @()
foreach ($fact in $Facts) {
  $line = [string]$fact
  $line = $line.Trim()
  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  if (-not $SkipHeuristicCheck) {
    if ($line -match "(将要|计划|后续|建议)") {
      throw "Fact contains planning words ('$line'). Rewrite as happened fact or use -SkipHeuristicCheck."
    }
  }

  if ($line.StartsWith("- ")) {
    $normalizedFacts += $line
  } else {
    $normalizedFacts += "- $line"
  }
}

if ($normalizedFacts.Count -eq 0) {
  throw "Facts must contain at least one non-empty item."
}

$raw = Get-Content -LiteralPath $LogPath -Raw -Encoding UTF8
$raw = $raw -replace "`r?`n", "`r`n"

$today = Get-Date -Format "yyyy-MM-dd"
$todayHeader = "## $today"

if ($raw -notmatch "(?m)^##\s+$([regex]::Escape($today))\s*$") {
  $raw = $raw.TrimEnd("`r", "`n")
  $raw += "`r`n`r`n$todayHeader`r`n"
}

$appendBlock = "`r`n### $cleanTitle`r`n"
$appendBlock += ([string]::Join("`r`n", $normalizedFacts))
$appendBlock += "`r`n"

$next = $raw + $appendBlock

if ($DryRun) {
  Write-Output $appendBlock
  exit 0
}

[System.IO.File]::WriteAllText((Resolve-Path $LogPath), $next, [System.Text.UTF8Encoding]::new($false))
Write-Output "Appended section '$cleanTitle' to $LogPath under $todayHeader"
