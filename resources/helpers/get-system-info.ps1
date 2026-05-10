# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  $os  = Get-CimInstance -ClassName Win32_OperatingSystem
  $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
  $mem = Get-CimInstance -ClassName Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum

  [PSCustomObject]@{
    osCaption     = $os.Caption
    osBuild       = $os.BuildNumber
    osVersion     = $os.Version
    lastBoot      = $os.LastBootUpTime.ToString('o')
    cpuName       = $cpu.Name
    ramGB         = [math]::Round($mem.Sum / 1GB, 1)
    computerName  = $env:COMPUTERNAME
    userName      = $env:USERNAME
  } | ConvertTo-Json -Depth 3 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
