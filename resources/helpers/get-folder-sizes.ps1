# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $profile = [Environment]::GetFolderPath('UserProfile')

  # Folders to measure — ordered by most likely to be large
  $targets = @(
    @{ name = 'Pictures';   path = Join-Path $profile 'Pictures' },
    @{ name = 'Downloads';  path = Join-Path $profile 'Downloads' },
    @{ name = 'Videos';     path = Join-Path $profile 'Videos' },
    @{ name = 'Documents';  path = Join-Path $profile 'Documents' },
    @{ name = 'Music';      path = Join-Path $profile 'Music' },
    @{ name = 'OneDrive';   path = Join-Path $profile 'OneDrive' },
    @{ name = 'Desktop';    path = Join-Path $profile 'Desktop' }
  )

  # Recycle bin size via shell COM (read-only query)
  $recycleSizeBytes = 0
  try {
    $shell = New-Object -ComObject Shell.Application
    $recycleBin = $shell.Namespace(0xA)
    $recycleSizeBytes = ($recycleBin.Items() | Measure-Object -Property Size -Sum -ErrorAction SilentlyContinue).Sum
  } catch { }

  # Temp files
  $tempSizeBytes = 0
  try {
    $tempSizeBytes = (Get-ChildItem -Path $env:TEMP -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
  } catch { }

  $results = @($targets | Where-Object { Test-Path $_.path } | ForEach-Object {
    $size = (Get-ChildItem -Path $_.path -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
    $count = (Get-ChildItem -Path $_.path -Recurse -File -ErrorAction SilentlyContinue).Count
    if ($size -gt 500MB) {
      [PSCustomObject]@{
        name      = $_.name
        path      = $_.path
        sizeGB    = [math]::Round($size / 1GB, 2)
        itemCount = $count
      }
    }
  } | Where-Object { $_ } | Sort-Object sizeGB -Descending)

  # Add Recycle Bin + Temp as one combined entry if non-trivial
  $junkGB = [math]::Round(($recycleSizeBytes + $tempSizeBytes) / 1GB, 2)
  if ($junkGB -gt 0.1) {
    $results += [PSCustomObject]@{
      name      = 'Recycle bin & temp files'
      path      = ''
      sizeGB    = $junkGB
      itemCount = $null
    }
  }

  @($results) | ConvertTo-Json -Depth 4 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
