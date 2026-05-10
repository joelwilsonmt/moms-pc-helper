# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $printers = Get-Printer | ForEach-Object {
    $name = $_.Name
    $status = switch ($_.PrinterStatus) {
      'Normal'  { 'ready' }
      'Paused'  { 'paused' }
      'Offline' { 'offline' }
      'Error'   { 'error' }
      default   { 'error' }
    }
    $jobs = @(Get-PrintJob -PrinterName $name -ErrorAction SilentlyContinue)
    $stuckJobs = @($jobs | Where-Object {
      $_.JobStatus -match 'Error|Deleting|Offline|PaperOut|UserIntervention' -or
      ($_.SubmittedTime -and ((Get-Date) - $_.SubmittedTime).TotalMinutes -gt 5)
    })
    $lastJob = $jobs | Sort-Object SubmittedTime -Descending | Select-Object -First 1
    [PSCustomObject]@{
      name      = $name
      status    = $status
      jobsStuck = $stuckJobs.Count
      lastUsed  = if ($lastJob) { $lastJob.SubmittedTime.ToString('o') } else { $null }
    }
  }
  ConvertTo-Json -InputObject @($printers) -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
