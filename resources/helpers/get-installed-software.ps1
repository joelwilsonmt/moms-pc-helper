# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $paths = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  $programs = Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 -and $_.ReleaseType -ne 'Security Update' } |
    Select-Object DisplayName, Publisher, DisplayVersion, InstallDate, EstimatedSize |
    Sort-Object DisplayName
  @($programs | ForEach-Object {
    [PSCustomObject]@{
      name            = $_.DisplayName
      publisher       = $_.Publisher
      version         = $_.DisplayVersion
      installDate     = $_.InstallDate
      estimatedSizeMB = if ($_.EstimatedSize) { [math]::Round($_.EstimatedSize / 1024, 1) } else { $null }
    }
  }) | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
