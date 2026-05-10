# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  # File History
  $fhEnabled = $false
  $fhLastRun = $null
  try {
    $fhConfig = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SPP\Clients' -ErrorAction SilentlyContinue
    # Check File History service config via registry (read-only)
    $fhKey = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\FileHistory' -ErrorAction SilentlyContinue
    if ($fhKey -and $fhKey.Enabled -eq 1) {
      $fhEnabled = $true
      if ($fhKey.LastBackupTime) {
        $fhLastRun = [DateTime]::FromFileTime($fhKey.LastBackupTime).ToString('o')
      }
    }
  } catch { }

  # OneDrive sync state
  $odSyncing = $false
  $odLastSync = $null
  try {
    $odKey = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\OneDrive\Accounts\Personal' -ErrorAction SilentlyContinue
    if ($odKey -and $odKey.UserFolder) {
      $odSyncing = Test-Path $odKey.UserFolder
    }
  } catch { }

  # Build category list
  $categories = @(
    [PSCustomObject]@{
      name      = 'Photos'
      coveredBy = @(if ($fhEnabled) { 'File History' } if ($odSyncing) { 'OneDrive' })
      lastBackup = $fhLastRun
      state     = if ($fhEnabled -or $odSyncing) { 'safe' } else { 'off' }
    },
    [PSCustomObject]@{
      name      = 'Documents'
      coveredBy = @(if ($fhEnabled) { 'File History' } if ($odSyncing) { 'OneDrive' })
      lastBackup = $fhLastRun
      state     = if ($fhEnabled -or $odSyncing) { 'safe' } else { 'off' }
    },
    [PSCustomObject]@{
      name      = 'Email'
      coveredBy = @()
      lastBackup = $null
      state     = 'off'
    }
  )

  [PSCustomObject]@{
    fileHistoryEnabled = $fhEnabled
    fileHistoryLastRun = $fhLastRun
    oneDriveSyncing    = $odSyncing
    oneDriveLastSync   = $odLastSync
    categories         = $categories
  } | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
