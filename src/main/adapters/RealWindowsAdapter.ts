// RealWindowsAdapter — only instantiated when process.platform === 'win32'.
// All data comes from PowerShell scripts in /resources/helpers/ via runScript().
// No write operations exist here — see WindowsAdapter.ts for the interface contract.

import { exec } from 'child_process'
import { promisify } from 'util'
import type { WindowsAdapter } from './WindowsAdapter'
import type {
  VolumeInfo,
  PrinterInfo,
  PrintJobInfo,
  InternetStatus,
  BackupStatus,
  InstalledProgram,
  UpdatesAvailable
} from '@shared/types'
import { runScript } from '../powershell'

const execAsync = promisify(exec)

export class RealWindowsAdapter implements WindowsAdapter {
  async getVolumes(): Promise<VolumeInfo[]> {
    const raw = await runScript<RawVolume[]>('get-volumes.ps1')
    return raw.map((v) => ({
      letter: v.letter,
      label: v.label ?? `${v.letter} Drive`,
      totalGB: v.totalGB,
      freeGB: v.freeGB,
      isSystemDrive: v.isSystemDrive,
      isRemovable: v.isRemovable,
      health: v.health ?? 'unknown'
    }))
  }

  async getPrinters(): Promise<PrinterInfo[]> {
    const raw = await runScript<RawPrinter[]>('get-printer-status.ps1')
    return raw.map((p) => ({
      name: p.name,
      status: p.status,
      jobsStuck: p.jobsStuck ?? 0,
      lastUsed: p.lastUsed ?? undefined
    }))
  }

  async getPrintJobs(): Promise<PrintJobInfo[]> {
    const raw = await runScript<RawPrintJob[]>('get-print-jobs.ps1')
    return raw.map((j) => ({
      printerName: j.printerName,
      documentName: j.documentName,
      pages: j.pages ?? 0,
      status: j.status,
      submittedAt: j.submittedAt,
      stuckMinutes: j.stuckMinutes ?? 0
    }))
  }

  async getInternetStatus(): Promise<InternetStatus> {
    return runScript<InternetStatus>('test-internet.ps1')
  }

  async getBackupStatus(): Promise<BackupStatus> {
    return runScript<BackupStatus>('get-backup-status.ps1')
  }

  async getInstalledPrograms(): Promise<InstalledProgram[]> {
    return runScript<InstalledProgram[]>('get-installed-software.ps1')
  }

  async getUpdatesAvailable(): Promise<UpdatesAvailable> {
    return runScript<UpdatesAvailable>('get-windows-updates.ps1')
  }

  async launchSettings(
    uri: 'backup' | 'windowsupdate' | 'printers' | 'storagesense' | 'appsfeatures'
  ): Promise<void> {
    await execAsync(`start ms-settings:${uri}`)
  }

  async launchExplorerFolder(path: string): Promise<void> {
    // Shell-escape the path — only pass alphanumeric, colon, backslash, space, dot, dash
    const safe = path.replace(/[^a-zA-Z0-9:\\\/\s.\-_]/g, '')
    await execAsync(`explorer.exe "${safe}"`)
  }

  async launchUrl(url: string): Promise<void> {
    // URL is already validated to https?:// in ipc.ts
    await execAsync(`start "" "${url}"`)
  }
}

// Raw shapes from PowerShell — may have null fields on older Windows versions
interface RawVolume {
  letter: string
  label: string | null
  totalGB: number
  freeGB: number
  isSystemDrive: boolean
  isRemovable: boolean
  health: 'ok' | 'warning' | 'unknown' | null
}

interface RawPrinter {
  name: string
  status: PrinterInfo['status']
  jobsStuck: number | null
  lastUsed: string | null
}

interface RawPrintJob {
  printerName: string
  documentName: string
  pages: number | null
  status: string
  submittedAt: string
  stuckMinutes: number | null
}
