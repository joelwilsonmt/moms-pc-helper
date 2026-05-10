// Zustand store — system data shared across all screens.
// The Home screen drives refresh + polling; other screens read from here.

import { create } from 'zustand'
import type { VolumeInfo, PrinterInfo, InternetStatus, BackupStatus, AppConfig } from '../../shared/types'

interface SystemStore {
  volumes: VolumeInfo[]
  printers: PrinterInfo[]
  internet: InternetStatus | null
  backup: BackupStatus | null
  config: AppConfig | null
  loading: boolean
  lastChecked: Date | null
  error: string | null
  refresh: () => Promise<void>
}

export const useSystemStore = create<SystemStore>((set) => ({
  volumes: [],
  printers: [],
  internet: null,
  backup: null,
  config: null,
  loading: false,
  lastChecked: null,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null })
    const [volR, priR, netR, bakR, cfgR] = await Promise.allSettled([
      window.api.system.getVolumes(),
      window.api.system.getPrinters(),
      window.api.system.getInternetStatus(),
      window.api.system.getBackupStatus(),
      window.api.app.getConfig()
    ])

    const errors: string[] = []
    const ok = <T>(r: PromiseSettledResult<T>, fallback: T): T => {
      if (r.status === 'rejected') { errors.push(String(r.reason)); return fallback }
      return r.value
    }

    set({
      volumes:     ok(volR, []),
      printers:    ok(priR, []),
      internet:    ok(netR, null),
      backup:      ok(bakR, null),
      config:      ok(cfgR, null),
      loading:     false,
      lastChecked: new Date(),
      error:       errors.length > 0 ? errors.join(' | ') : null
    })
  }
}))

// ── Derived helpers ──────────────────────────────────────────────────────────

export interface HeadlineState {
  variant: 'default' | 'warn' | 'good'
  eyebrow: string
  headline: string
  sub: string
  ctaLabel?: string
  ctaScreen?: 'disk' | 'print' | 'internet' | 'backup'
  ctaMeta?: string
}

export function computeHeadline(
  volumes: VolumeInfo[],
  printers: PrinterInfo[],
  internet: InternetStatus | null,
  backup: BackupStatus | null
): HeadlineState {
  // Most-full drive (exclude removable)
  const fixed = volumes.filter((v) => !v.isRemovable)
  const mostFull = fixed.reduce<VolumeInfo | null>((max, v) => {
    if (!max) return v
    const usedPct = (v.totalGB - v.freeGB) / v.totalGB
    const maxPct = (max.totalGB - max.freeGB) / max.totalGB
    return usedPct > maxPct ? v : max
  }, null)

  if (mostFull) {
    const usedPct = ((mostFull.totalGB - mostFull.freeGB) / mostFull.totalGB) * 100
    if (usedPct >= 90) {
      const freeOnBig = volumes.find((v) => !v.isSystemDrive && !v.isRemovable)
      const bigDriveHint = freeOnBig
        ? ` Your big drive has ${Math.round(freeOnBig.freeGB)} GB free.`
        : ''
      return {
        variant: 'warn',
        eyebrow: 'Needs your attention',
        headline: `Your main drive is ${Math.round(usedPct)}% full`,
        sub: `Let's move some photos to your big drive — there's plenty of room over there.${bigDriveHint}`,
        ctaLabel: 'Show me how to free up space',
        ctaScreen: 'disk',
        ctaMeta: 'A guided walkthrough · about 10 minutes'
      }
    }
  }

  // Stuck print jobs
  const stuckPrinter = printers.find((p) => p.jobsStuck > 0)
  if (stuckPrinter) {
    return {
      variant: 'warn',
      eyebrow: 'Needs your attention',
      headline: `${stuckPrinter.jobsStuck} document${stuckPrinter.jobsStuck === 1 ? '' : 's'} stuck on your printer`,
      sub: `${stuckPrinter.name} has jobs that aren't printing. This is usually easy to fix.`,
      ctaLabel: 'Show me how to fix this',
      ctaScreen: 'print',
      ctaMeta: 'Takes about 20 seconds'
    }
  }

  // Internet down
  if (internet && !internet.online) {
    return {
      variant: 'default',
      eyebrow: 'Internet is down',
      headline: 'I checked everything — your router needs a restart',
      sub: 'This happens sometimes. It only takes about 90 seconds.',
      ctaLabel: 'Show me how to restart my router',
      ctaScreen: 'internet',
      ctaMeta: 'Three simple steps · about 90 seconds'
    }
  }

  // Backup behind or off
  if (backup) {
    const worstCategory = backup.categories.find((c) => c.state === 'off')
      ?? backup.categories.find((c) => c.state === 'behind')
    if (worstCategory) {
      return {
        variant: 'warn',
        eyebrow: 'Mostly safe',
        headline: 'A few things aren\'t backed up yet',
        sub: `${worstCategory.name} ${worstCategory.state === 'off' ? 'isn\'t being backed up' : 'is behind'}. Let\'s fix that.`,
        ctaLabel: 'Show me how to back up',
        ctaScreen: 'backup',
        ctaMeta: 'Walk through setting up Windows Backup'
      }
    }
  }

  return {
    variant: 'good',
    eyebrow: 'Everything looks good',
    headline: 'Your PC is healthy',
    sub: 'Last checked just now. I\'ll let you know if anything comes up.'
  }
}

export function lastCheckedLabel(date: Date | null): string {
  if (!date) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`
}

export function printerPill(printers: PrinterInfo[]): { label: string; variant: 'good' | 'warn' | 'bad' | 'default' } {
  if (printers.length === 0) return { label: 'Not found', variant: 'default' }
  const stuck = printers.find((p) => p.jobsStuck > 0)
  if (stuck) return { label: `${stuck.jobsStuck} stuck`, variant: 'bad' }
  const offline = printers.find((p) => p.status === 'offline')
  if (offline) return { label: 'Offline', variant: 'bad' }
  const error = printers.find((p) => p.status === 'error')
  if (error) return { label: 'Error', variant: 'bad' }
  return { label: 'Ready', variant: 'good' }
}

export function internetPill(internet: InternetStatus | null): { label: string; variant: 'good' | 'warn' | 'bad' | 'default' } {
  if (!internet) return { label: 'Checking…', variant: 'default' }
  if (!internet.online) return { label: 'Down', variant: 'bad' }
  if (internet.diagnosis === 'router-issue') return { label: 'Router issue', variant: 'warn' }
  return { label: 'Working', variant: 'good' }
}

export function backupPill(backup: BackupStatus | null): { label: string; variant: 'good' | 'warn' | 'bad' | 'default' } {
  if (!backup) return { label: 'Checking…', variant: 'default' }
  const off = backup.categories.some((c) => c.state === 'off')
  const behind = backup.categories.some((c) => c.state === 'behind')
  if (off) return { label: 'Not set up', variant: 'bad' }
  if (behind) return { label: 'Behind', variant: 'warn' }
  if (backup.fileHistoryLastRun) {
    const daysAgo = Math.floor((Date.now() - new Date(backup.fileHistoryLastRun).getTime()) / 86_400_000)
    if (daysAgo === 0) return { label: 'Today', variant: 'good' }
    if (daysAgo === 1) return { label: 'Yesterday', variant: 'good' }
    return { label: `${daysAgo} days ago`, variant: daysAgo > 3 ? 'warn' : 'good' }
  }
  return { label: 'Up to date', variant: 'good' }
}

export function diskPill(volumes: VolumeInfo[]): { label: string; variant: 'good' | 'warn' | 'bad' | 'default' } {
  const sys = volumes.find((v) => v.isSystemDrive)
  if (!sys) return { label: 'Unknown', variant: 'default' }
  const pct = Math.round(((sys.totalGB - sys.freeGB) / sys.totalGB) * 100)
  if (pct >= 90) return { label: `${pct}% full`, variant: 'bad' }
  if (pct >= 75) return { label: `${pct}% full`, variant: 'warn' }
  return { label: `${pct}% used`, variant: 'good' }
}
