// MockAdapter — used on non-Windows platforms (process.platform !== 'win32').
// Returns fixture data so all UI work can be done from a Mac.
// Data is crafted to exercise the "attention needed" states shown in the wireframe.

import type { WindowsAdapter } from './WindowsAdapter'
import type {
  VolumeInfo,
  PrinterInfo,
  PrintJobInfo,
  InternetStatus,
  BackupStatus,
  InstalledProgram,
  UpdatesAvailable,
  FolderSize
} from '@shared/types'

const delay = (ms = 120): Promise<void> => new Promise((r) => setTimeout(r, ms))

export class MockAdapter implements WindowsAdapter {
  async getVolumes(): Promise<VolumeInfo[]> {
    await delay()
    return [
      {
        letter: 'C:',
        label: 'Samsung 256GB SSD',
        totalGB: 256,
        freeGB: 19.2,
        isSystemDrive: true,
        isRemovable: false,
        health: 'ok'
      },
      {
        letter: 'D:',
        label: 'WDC 1TB Internal',
        totalGB: 1000,
        freeGB: 812,
        isSystemDrive: false,
        isRemovable: false,
        health: 'ok'
      }
    ]
  }

  async getPrinters(): Promise<PrinterInfo[]> {
    await delay()
    return [
      {
        name: 'Brother HL-L2350DW',
        status: 'error',
        jobsStuck: 3,
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  async getPrintJobs(): Promise<PrintJobInfo[]> {
    await delay()
    const base = Date.now() - 28 * 60 * 1000
    return [
      {
        printerName: 'Brother HL-L2350DW',
        documentName: 'doctor-paperwork.pdf',
        pages: 4,
        status: 'Error',
        submittedAt: new Date(base).toISOString(),
        stuckMinutes: 28
      },
      {
        printerName: 'Brother HL-L2350DW',
        documentName: 'recipe.pdf',
        pages: 1,
        status: 'Error',
        submittedAt: new Date(base).toISOString(),
        stuckMinutes: 28
      },
      {
        printerName: 'Brother HL-L2350DW',
        documentName: 'Tax form W-9',
        pages: 8,
        status: 'Error',
        submittedAt: new Date(base - 5 * 60 * 1000).toISOString(),
        stuckMinutes: 33
      }
    ]
  }

  async getInternetStatus(): Promise<InternetStatus> {
    await delay()
    return {
      online: true,
      gatewayReachable: true,
      dnsWorking: true,
      latencyMs: 18,
      diagnosis: 'ok'
    }
  }

  async getBackupStatus(): Promise<BackupStatus> {
    await delay()
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    return {
      fileHistoryEnabled: true,
      fileHistoryLastRun: twoDaysAgo,
      oneDriveSyncing: true,
      oneDriveLastSync: twoDaysAgo,
      categories: [
        {
          name: 'Photos',
          coveredBy: ['Big Drive', 'Backblaze'],
          lastBackup: twoDaysAgo,
          state: 'safe'
        },
        {
          name: 'Documents',
          coveredBy: ['Big Drive', 'Backblaze'],
          lastBackup: twoDaysAgo,
          state: 'safe'
        },
        {
          name: 'Camper photos on phone',
          coveredBy: [],
          lastBackup: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          state: 'behind'
        },
        {
          name: 'Email',
          coveredBy: [],
          state: 'off'
        }
      ]
    }
  }

  async getInstalledPrograms(): Promise<InstalledProgram[]> {
    await delay()
    return [
      { name: 'Google Chrome', publisher: 'Google LLC', version: '124.0.6367.60' },
      { name: 'Microsoft Office 365', publisher: 'Microsoft', version: '16.0.17531.20152' },
      { name: 'Zoom', publisher: 'Zoom Video Communications', version: '6.1.6.41200' },
      { name: 'McAfee Total Protection', publisher: 'McAfee', version: '16.0.51', estimatedSizeMB: 1240 },
      { name: 'Adobe Acrobat Reader', publisher: 'Adobe', version: '24.2.20965' }
    ]
  }

  async getUpdatesAvailable(): Promise<UpdatesAvailable> {
    await delay()
    return {
      windows: { count: 2, needsRestart: true, estimatedMinutes: 4 },
      apps: [
        { name: 'Google Chrome', fromVersion: '124.0.6367.60', toVersion: '125.0.6422.60', estimatedMinutes: 2 },
        { name: 'Microsoft Office', fromVersion: '16.0.17531', toVersion: '16.0.17628', estimatedMinutes: 3 },
        { name: 'Zoom', fromVersion: '6.1.6', toVersion: '6.2.0', estimatedMinutes: 2 }
      ]
    }
  }

  async getFolderSizes(): Promise<FolderSize[]> {
    await delay()
    return [
      { name: 'Pictures',                 path: 'C:\\Users\\Jan\\Pictures',   sizeGB: 47.2, itemCount: 1247 },
      { name: 'OneDrive',                 path: 'C:\\Users\\Jan\\OneDrive',   sizeGB: 12.1, itemCount: 843 },
      { name: 'Downloads',                path: 'C:\\Users\\Jan\\Downloads',  sizeGB: 18.4, itemCount: 312 },
      { name: 'Recycle bin & temp files', path: '',                           sizeGB: 5.9,  itemCount: null }
    ]
  }

  async launchSettings(
    _uri: 'backup' | 'windowsupdate' | 'printers' | 'storagesense' | 'appsfeatures'
  ): Promise<void> {
    await delay(50)
    // On macOS dev: no-op. On Windows this opens ms-settings:<uri>.
  }

  async launchExplorerFolder(_path: string): Promise<void> {
    await delay(50)
  }

  async launchUrl(_url: string): Promise<void> {
    await delay(50)
  }
}
