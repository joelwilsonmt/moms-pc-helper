// Diagnostics bundle builder — gathers everything Joel needs to debug remotely.
// Called by panic.ts before sending the email. Read-only: collects data, never modifies.

import { app, desktopCapturer } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'
import type { WindowsAdapter } from '../adapters/WindowsAdapter'
import type {
  VolumeInfo, PrinterInfo, PrintJobInfo,
  InternetStatus, BackupStatus
} from '@shared/types'

export interface DiagnosticBundle {
  timestamp: string
  appVersion: string
  platform: string
  arch: string
  message: string
  system: {
    volumes: VolumeInfo[]
    printers: PrinterInfo[]
    printJobs: PrintJobInfo[]
    internet: InternetStatus | null
    backup: BackupStatus | null
    rawSysInfo?: unknown
  }
  logs: string
}

// Grab the last N lines of electron-log output (rolls up to 7 days of files)
function collectLogs(maxLines = 300): string {
  try {
    const logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(logDir)) return '(no log directory found)'

    const files = readdirSync(logDir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => join(logDir, f))
      .sort()                        // oldest first
      .slice(-7)                     // last 7 files (one per day)

    const lines: string[] = []
    for (const f of files) {
      try { lines.push(...readFileSync(f, 'utf8').split('\n')) } catch { /* skip unreadable */ }
    }
    return lines.slice(-maxLines).join('\n')
  } catch {
    return '(could not read logs)'
  }
}

export async function buildBundle(
  message: string,
  adapter: WindowsAdapter
): Promise<DiagnosticBundle> {
  // Fire all reads in parallel — if any fails, substitute a safe default
  const [volumes, printers, printJobs, internet, backup] = await Promise.allSettled([
    adapter.getVolumes(),
    adapter.getPrinters(),
    adapter.getPrintJobs(),
    adapter.getInternetStatus(),
    adapter.getBackupStatus()
  ])

  // Try to get raw system info on Windows
  let rawSysInfo: unknown
  if (process.platform === 'win32') {
    try {
      const { runScript } = await import('../powershell')
      rawSysInfo = await runScript('get-system-info.ps1')
    } catch { /* not critical */ }
  }

  return {
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    platform: `${process.platform} ${process.arch}`,
    arch: process.arch,
    message,
    system: {
      volumes:   volumes.status   === 'fulfilled' ? volumes.value   : [],
      printers:  printers.status  === 'fulfilled' ? printers.value  : [],
      printJobs: printJobs.status === 'fulfilled' ? printJobs.value : [],
      internet:  internet.status  === 'fulfilled' ? internet.value  : null,
      backup:    backup.status    === 'fulfilled' ? backup.value    : null,
      rawSysInfo
    },
    logs: collectLogs()
  }
}

// Capture a PNG screenshot of the primary display. Returns null if unavailable.
export async function captureScreenshot(): Promise<Buffer | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 800 }
    })
    const primary = sources[0]
    if (!primary) return null
    return primary.thumbnail.toPNG()
  } catch {
    return null
  }
}

// Human-readable email body — plain English so Joel can read it on his phone
export function formatEmailBody(bundle: DiagnosticBundle, screenshotAttached: boolean): string {
  const sys = bundle.system
  const driveLines = sys.volumes.map((v) => {
    const pct = Math.round(((v.totalGB - v.freeGB) / v.totalGB) * 100)
    return `  ${v.letter} ${v.label} — ${pct}% full (${v.freeGB} GB free of ${v.totalGB} GB)`
  }).join('\n')

  const printerLines = sys.printers.map((p) =>
    `  ${p.name} — ${p.status}${p.jobsStuck ? `, ${p.jobsStuck} job(s) stuck` : ''}`
  ).join('\n') || '  (none detected)'

  const netLine = sys.internet
    ? sys.internet.online
      ? `Online (${sys.internet.latencyMs ?? '?'} ms)`
      : `OFFLINE — diagnosis: ${sys.internet.diagnosis}`
    : 'Unknown'

  return `Jan's PC — Something's wrong
${'='.repeat(40)}

Jan's message:
"${bundle.message}"

Sent: ${new Date(bundle.timestamp).toLocaleString()}
App version: ${bundle.appVersion}

DRIVES
${driveLines || '  (none detected)'}

PRINTER
${printerLines}

INTERNET
  ${netLine}

BACKUP
  File History: ${sys.backup?.fileHistoryEnabled ? 'enabled' : 'disabled'}
  OneDrive: ${sys.backup?.oneDriveSyncing ? 'syncing' : 'not syncing'}

${screenshotAttached ? 'Screenshot attached.' : ''}
Full diagnostic data attached as diagnostic-bundle.json.

—
Mom's PC Helper v${bundle.appVersion}
`
}
