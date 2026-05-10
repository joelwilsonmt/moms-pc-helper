# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $now = Get-Date
  $jobs = Get-Printer | ForEach-Object {
    $printerName = $_.Name
    Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue | ForEach-Object {
      $stuck = 0
      if ($_.SubmittedTime) {
        $stuck = [math]::Round(($now - $_.SubmittedTime).TotalMinutes)
      }
      [PSCustomObject]@{
        printerName  = $printerName
        documentName = $_.DocumentName
        pages        = $_.TotalPages
        status       = "$($_.JobStatus)"
        submittedAt  = if ($_.SubmittedTime) { $_.SubmittedTime.ToString('o') } else { $now.ToString('o') }
        stuckMinutes = $stuck
      }
    }
  }
  ConvertTo-Json -InputObject @($jobs) -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
