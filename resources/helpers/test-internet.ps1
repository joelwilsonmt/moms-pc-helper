# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  # Gateway IP from the active adapter
  $gateway = $null
  $adapters = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric |
    Select-Object -First 1
  if ($adapters) { $gateway = $adapters.NextHop }

  $gatewayOk = $false
  if ($gateway) {
    $pingGw = Test-Connection -ComputerName $gateway -Count 1 -Quiet -ErrorAction SilentlyContinue
    $gatewayOk = [bool]$pingGw
  }

  # Public DNS (Cloudflare)
  $dnsOk = Test-Connection -ComputerName '1.1.1.1' -Count 1 -Quiet -ErrorAction SilentlyContinue
  $dnsOk = [bool]$dnsOk

  # Latency to a reliable host
  $latencyMs = $null
  $ping = Test-Connection -ComputerName '8.8.8.8' -Count 1 -ErrorAction SilentlyContinue
  if ($ping) { $latencyMs = $ping.Latency }

  # DNS resolution
  $dnsWorking = $false
  try {
    $resolved = Resolve-DnsName -Name 'google.com' -ErrorAction Stop
    $dnsWorking = $resolved.Count -gt 0
  } catch { $dnsWorking = $false }

  $online = $dnsOk -and $dnsWorking

  $diagnosis = 'ok'
  if (-not $online) {
    if (-not $gatewayOk) { $diagnosis = 'router-issue' }
    elseif (-not $dnsOk)  { $diagnosis = 'isp-issue' }
    elseif (-not $dnsWorking) { $diagnosis = 'dns-issue' }
    else { $diagnosis = 'computer-issue' }
  }

  [PSCustomObject]@{
    online           = $online
    gatewayReachable = $gatewayOk
    dnsWorking       = $dnsWorking
    latencyMs        = $latencyMs
    diagnosis        = $diagnosis
  } | ConvertTo-Json -Depth 3 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
