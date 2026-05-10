# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $vols = Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object {
    $letter = "$($_.DriveLetter):"
    $isSystem = ($letter -eq $env:SystemDrive)
    $removable = $_.DriveType -eq 'Removable'
    $health = switch ($_.HealthStatus) {
      'Healthy' { 'ok' }
      'Warning'  { 'warning' }
      default    { 'unknown' }
    }
    [PSCustomObject]@{
      letter       = $letter
      label        = if ($_.FileSystemLabel) { $_.FileSystemLabel } else { "$letter Drive" }
      totalGB      = [math]::Round($_.Size / 1GB, 1)
      freeGB       = [math]::Round($_.SizeRemaining / 1GB, 1)
      isSystemDrive = $isSystem
      isRemovable  = $removable
      health       = $health
    }
  }
  # Wrap single object in array so JSON output is always an array
  @($vols) | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
