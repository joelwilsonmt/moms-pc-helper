// WindowsAdapter interface — §3.3 enforcement point #1.
//
// INVARIANT: this interface must contain ONLY read-style methods.
// Allowed prefixes: get*, read*, list*, check*, test*, launch*, is*, has*
// Forbidden prefixes: set*, delete*, move*, restart*, install*, uninstall*, create*, update*
//
// Adding a write method requires stopping and asking Joel first. The answer is no.

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

export interface WindowsAdapter {
  // Disk
  getVolumes(): Promise<VolumeInfo[]>;

  // Printers
  getPrinters(): Promise<PrinterInfo[]>;
  getPrintJobs(): Promise<PrintJobInfo[]>;

  // Network
  getInternetStatus(): Promise<InternetStatus>;

  // Backup
  getBackupStatus(): Promise<BackupStatus>;

  // Software
  getInstalledPrograms(): Promise<InstalledProgram[]>;
  getUpdatesAvailable(): Promise<UpdatesAvailable>;

  getFolderSizes(): Promise<FolderSize[]>;

  // Launch built-in Windows UI (opening a UI is not modifying anything)
  launchSettings(uri: 'backup' | 'windowsupdate' | 'printers' | 'storagesense' | 'appsfeatures'): Promise<void>;
  launchExplorerFolder(path: string): Promise<void>;
  launchUrl(url: string): Promise<void>;
}
