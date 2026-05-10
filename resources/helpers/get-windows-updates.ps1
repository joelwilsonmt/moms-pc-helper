# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  # Windows updates via COM (read-only — no -Install flag)
  $session   = New-Object -ComObject Microsoft.Update.Session
  $searcher  = $session.CreateUpdateSearcher()
  $result    = $searcher.Search('IsInstalled=0 and Type=''Software''')
  $needsRestart = $false
  $estimatedMin = 0
  $updates = @($result.Updates | ForEach-Object {
    if ($_.InstallationBehavior.RebootBehavior -gt 0) { $needsRestart = $true }
    $estimatedMin += 2   # conservative estimate per update
    $_.Title
  })

  # winget upgrades (read-only enumeration)
  $appUpdates = @()
  try {
    $wingetOutput = & winget upgrade --include-unknown 2>$null
    if ($wingetOutput) {
      $lines = $wingetOutput | Select-String -Pattern '^\S' | Select-Object -Skip 2
      $appUpdates = @($lines | ForEach-Object {
        $parts = $_.Line -split '\s{2,}'
        if ($parts.Count -ge 4) {
          [PSCustomObject]@{
            name          = $parts[0].Trim()
            fromVersion   = $parts[2].Trim()
            toVersion     = $parts[3].Trim()
            estimatedMinutes = 2
          }
        }
      } | Where-Object { $_ })
    }
  } catch { }

  [PSCustomObject]@{
    windows = [PSCustomObject]@{
      count            = $updates.Count
      needsRestart     = $needsRestart
      estimatedMinutes = $estimatedMin
    }
    apps = $appUpdates
  } | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
