// IPC contracts + DTOs — single source of truth for renderer ↔ main boundary.
// The renderer never touches Node directly; everything goes through window.api.

export interface VolumeInfo {
  letter: string;        // "C:"
  label: string;         // "Samsung 256GB SSD"
  totalGB: number;
  freeGB: number;
  isSystemDrive: boolean;
  isRemovable: boolean;
  health: 'ok' | 'warning' | 'unknown';
}

export interface PrinterInfo {
  name: string;
  status: 'ready' | 'error' | 'offline' | 'paused';
  jobsStuck: number;
  lastUsed?: string;     // ISO date
}

export interface PrintJobInfo {
  printerName: string;
  documentName: string;
  pages: number;
  status: string;
  submittedAt: string;   // ISO date
  stuckMinutes: number;
}

export interface InternetStatus {
  online: boolean;
  gatewayReachable: boolean;
  dnsWorking: boolean;
  latencyMs?: number;
  diagnosis?: 'ok' | 'router-issue' | 'isp-issue' | 'dns-issue' | 'computer-issue';
}

export interface BackupStatus {
  fileHistoryEnabled: boolean;
  fileHistoryLastRun?: string;  // ISO
  oneDriveSyncing: boolean;
  oneDriveLastSync?: string;
  categories: Array<{
    name: string;
    coveredBy: string[];
    lastBackup?: string;
    state: 'safe' | 'behind' | 'off';
  }>;
}

export interface InstalledProgram {
  name: string;
  publisher?: string;
  version?: string;
  installDate?: string;
  estimatedSizeMB?: number;
}

export interface UpdatesAvailable {
  windows: { count: number; needsRestart: boolean; estimatedMinutes: number };
  apps: Array<{ name: string; fromVersion: string; toVersion: string; estimatedMinutes: number }>;
}

export interface VaultEntry {
  id: string;
  category: 'wifi' | 'accounts' | 'documents' | 'camper' | 'subaru' | 'vet';
  title: string;
  body: string;          // decrypted on read
  attachmentIds: string[];
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  costMonthly: number;   // dollars
  renewalDate: string;   // ISO
  category: 'streaming' | 'antivirus' | 'storage' | 'music' | 'shopping' | 'fitness' | 'other';
  cancelUrl?: string;
  notes?: string;
}

export interface ScamVerdict {
  verdict: 'scam' | 'suspicious' | 'safe' | 'unknown';
  reason: string;
  recommendations: string[];
  flaggedPatterns: string[];
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string;
  items: Array<{ id: string; text: string; hint?: string }>;
}

export interface ChecklistRun {
  templateId: string;
  startedAt: string;
  completedItems: string[];
  lastUpdated: string;
}

export interface Guide {
  id: string;
  category: string;
  title: string;
  steps: number;
  estimatedMinutes?: number;
  body: string;          // markdown
  lastUpdated: string;
}

export interface AppConfig {
  userName: string;
  panicEmail: string;
  panicSmsNumber?: string;
  panicWebhook?: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  vaultAutoLockMinutes: number;
  scanIntervalMinutes: number;
  scamCheckImap?: { host: string; user: string; password: string };
  smtp: { host: string; port: number; user: string; password: string };
}

// The bridge exposed via contextBridge as window.api
export interface IpcAPI {
  system: {
    getVolumes(): Promise<VolumeInfo[]>;
    getPrinters(): Promise<PrinterInfo[]>;
    getPrintJobs(): Promise<PrintJobInfo[]>;
    getInternetStatus(): Promise<InternetStatus>;
    getBackupStatus(): Promise<BackupStatus>;
    getInstalledPrograms(): Promise<InstalledProgram[]>;
    getUpdatesAvailable(): Promise<UpdatesAvailable>;
  };
  launch: {
    settings(uri: 'backup' | 'windowsupdate' | 'printers' | 'storagesense' | 'appsfeatures'): Promise<void>;
    explorerFolder(path: string): Promise<void>;
    url(url: string): Promise<void>;
  };
  vault: {
    isInitialized(): Promise<boolean>;
    initialize(masterPassword: string): Promise<void>;
    unlock(masterPassword: string): Promise<boolean>;
    unlockWithHello(): Promise<boolean>;
    lock(): Promise<void>;
    list(category?: string): Promise<VaultEntry[]>;
    get(id: string): Promise<VaultEntry | null>;
    create(entry: Omit<VaultEntry, 'id' | 'updatedAt'>): Promise<VaultEntry>;
    update(id: string, patch: Partial<VaultEntry>): Promise<VaultEntry>;
    delete(id: string): Promise<void>;
    search(query: string): Promise<VaultEntry[]>;
  };
  subs: {
    list(): Promise<Subscription[]>;
    add(sub: Omit<Subscription, 'id'>): Promise<Subscription>;
    update(id: string, patch: Partial<Subscription>): Promise<Subscription>;
    delete(id: string): Promise<void>;
    detectOverlaps(): Promise<Array<{ subIds: string[]; reason: string }>>;
  };
  scam: {
    analyze(content: string): Promise<ScamVerdict>;
    history(limit: number): Promise<Array<{ at: string; preview: string; verdict: ScamVerdict }>>;
  };
  panic: {
    send(
      message: string,
      includeScreenshot: boolean
    ): Promise<{ ok: true } | { ok: false; error: string }>;
    captureScreenshot(): Promise<string | null>; // base64 PNG
  };
  content: {
    listGuides(category?: string): Promise<Guide[]>;
    getGuide(id: string): Promise<Guide | null>;
    searchGuides(query: string): Promise<Guide[]>;
    listChecklists(): Promise<ChecklistTemplate[]>;
    getChecklistRun(templateId: string): Promise<ChecklistRun | null>;
    toggleChecklistItem(templateId: string, itemId: string): Promise<ChecklistRun>;
    resetChecklist(templateId: string): Promise<void>;
  };
  app: {
    isFirstRun(): Promise<boolean>;
    completeOnboarding(): Promise<void>;
    getConfig(): Promise<AppConfig>;
    updateConfig(patch: Partial<AppConfig>): Promise<AppConfig>;
  };
}

// Augment the Window interface so TypeScript knows window.api exists in the renderer
declare global {
  interface Window {
    api: IpcAPI;
  }
}
