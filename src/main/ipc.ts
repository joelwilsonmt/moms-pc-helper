// IPC channel registry — §3.3 enforcement point #3.
// Every channel is explicit; no eval-style dynamic dispatch.
// Each channel maps to one read-only method on the adapter or a service.

import { ipcMain, shell } from 'electron'
import type { WindowsAdapter } from './adapters/WindowsAdapter'
import { vault, VaultUnavailableError } from './services/vault'

export function registerIpcHandlers(adapter: WindowsAdapter): void {
  // --- system ---
  ipcMain.handle('system:getVolumes', () => adapter.getVolumes())
  ipcMain.handle('system:getPrinters', () => adapter.getPrinters())
  ipcMain.handle('system:getPrintJobs', () => adapter.getPrintJobs())
  ipcMain.handle('system:getInternetStatus', () => adapter.getInternetStatus())
  ipcMain.handle('system:getBackupStatus', () => adapter.getBackupStatus())
  ipcMain.handle('system:getInstalledPrograms', () => adapter.getInstalledPrograms())
  ipcMain.handle('system:getUpdatesAvailable', () => adapter.getUpdatesAvailable())

  // --- launch ---
  ipcMain.handle('launch:settings', (_e, uri: string) => {
    const allowed = ['backup', 'windowsupdate', 'printers', 'storagesense', 'appsfeatures']
    if (!allowed.includes(uri)) throw new Error(`Unknown settings URI: ${uri}`)
    return adapter.launchSettings(uri as Parameters<WindowsAdapter['launchSettings']>[0])
  })

  ipcMain.handle('launch:explorerFolder', (_e, path: string) => {
    if (typeof path !== 'string' || path.length === 0) throw new Error('Invalid path')
    return adapter.launchExplorerFolder(path)
  })

  ipcMain.handle('launch:url', (_e, url: string) => {
    // Allowlist schemes — only http/https to prevent shell injection
    if (!/^https?:\/\//i.test(url)) throw new Error('Only http/https URLs allowed')
    shell.openExternal(url)
  })

  // --- vault (stubs until milestone 6) ---
  ipcMain.handle('vault:isInitialized', () => false)
  ipcMain.handle('vault:isInitialized', () => vault.isInitialized())
  ipcMain.handle('vault:initialize', (_e, pw: string) => vault.initialize(pw))
  ipcMain.handle('vault:unlock', (_e, pw: string) => vault.unlock(pw))
  ipcMain.handle('vault:unlockWithHello', () => vault.unlockWithHello())
  ipcMain.handle('vault:lock', () => vault.lock())
  ipcMain.handle('vault:list', (_e, cat?: string) => safeVault(() => vault.list(cat)))
  ipcMain.handle('vault:get', (_e, id: string) => safeVault(() => vault.get(id)))
  ipcMain.handle('vault:create', (_e, entry) => safeVault(() => vault.create(entry)))
  ipcMain.handle('vault:update', (_e, id: string, patch) => safeVault(() => vault.update(id, patch)))
  ipcMain.handle('vault:delete', (_e, id: string) => safeVault(() => vault.delete(id)))
  ipcMain.handle('vault:search', (_e, q: string) => safeVault(() => vault.search(q)))

  // --- subs (stubs until milestone 12) ---
  ipcMain.handle('subs:list', () => [])
  ipcMain.handle('subs:add', () => { throw new Error('Subs not yet implemented') })
  ipcMain.handle('subs:update', () => { throw new Error('Subs not yet implemented') })
  ipcMain.handle('subs:delete', () => undefined)
  ipcMain.handle('subs:detectOverlaps', () => [])

  // --- scam (stub until milestone 11) ---
  ipcMain.handle('scam:analyze', () => { throw new Error('Scam shield not yet implemented') })
  ipcMain.handle('scam:history', () => [])

  // --- panic (stub until milestone 7) ---
  ipcMain.handle('panic:send', () => ({ ok: false, error: 'Panic button not yet implemented' }))

  // --- content (stubs until milestone 9) ---
  ipcMain.handle('content:listGuides', () => [])
  ipcMain.handle('content:getGuide', () => null)
  ipcMain.handle('content:searchGuides', () => [])
  ipcMain.handle('content:listChecklists', () => [])
  ipcMain.handle('content:getChecklistRun', () => null)
  ipcMain.handle('content:toggleChecklistItem', () => { throw new Error('Content not yet implemented') })
  ipcMain.handle('content:resetChecklist', () => undefined)

  // --- app ---
  ipcMain.handle('app:isFirstRun', () => true)
  ipcMain.handle('app:completeOnboarding', () => undefined)
  ipcMain.handle('app:getConfig', () => defaultConfig())
  ipcMain.handle('app:updateConfig', () => defaultConfig())
}

// Wraps vault calls — returns a typed error string on VaultUnavailableError so
// the renderer can show a friendly "Windows only" message instead of crashing.
function safeVault<T>(fn: () => T): T | { __vaultError: string } {
  try {
    return fn()
  } catch (e) {
    if (e instanceof VaultUnavailableError) return { __vaultError: e.message }
    throw e
  }
}

function defaultConfig() {
  return {
    userName: 'Jan',
    panicEmail: '',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    vaultAutoLockMinutes: 15,
    scanIntervalMinutes: 5,
    smtp: { host: '', port: 587, user: '', password: '' }
  }
}
