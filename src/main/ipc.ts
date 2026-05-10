// IPC channel registry — §3.3 enforcement point #3.
// Every channel is explicit; no eval-style dynamic dispatch.
// Each channel maps to one read-only method on the adapter or a service.

import { ipcMain, shell } from 'electron'
import type { WindowsAdapter } from './adapters/WindowsAdapter'
import { vault, VaultUnavailableError } from './services/vault'
import { sendPanic } from './services/panic'
import { captureScreenshot } from './services/diagnostics'
import * as content from './services/content'
import * as scam from './services/scam'
import * as appConfig from './services/appConfig'

export function registerIpcHandlers(adapter: WindowsAdapter): void {
  // --- system ---
  ipcMain.handle('system:getVolumes', () => adapter.getVolumes())
  ipcMain.handle('system:getPrinters', () => adapter.getPrinters())
  ipcMain.handle('system:getPrintJobs', () => adapter.getPrintJobs())
  ipcMain.handle('system:getInternetStatus', () => adapter.getInternetStatus())
  ipcMain.handle('system:getBackupStatus', () => adapter.getBackupStatus())
  ipcMain.handle('system:getInstalledPrograms', () => adapter.getInstalledPrograms())
  ipcMain.handle('system:getUpdatesAvailable', () => adapter.getUpdatesAvailable())
  ipcMain.handle('system:getFolderSizes', () => adapter.getFolderSizes())

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

  // --- vault ---
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

  // --- scam ---
  ipcMain.handle('scam:analyze', (_e, content_: string) => scam.analyze(content_))
  ipcMain.handle('scam:history', (_e, limit: number) => scam.history(limit))

  // --- panic ---
  ipcMain.handle('panic:send', async (_e, message: string, includeScreenshot: boolean) => {
    const cfg = appConfig.getConfig()
    return sendPanic(message, includeScreenshot, cfg.panicEmail, adapter)
  })
  ipcMain.handle('panic:captureScreenshot', async () => {
    const buf = await captureScreenshot()
    return buf ? buf.toString('base64') : null
  })

  // --- content ---
  ipcMain.handle('content:listGuides', (_e, cat?: string) => content.listGuides(cat))
  ipcMain.handle('content:getGuide', (_e, id: string) => content.getGuide(id))
  ipcMain.handle('content:searchGuides', (_e, q: string) => content.searchGuides(q))
  ipcMain.handle('content:listChecklists', () => content.listChecklists())
  ipcMain.handle('content:getChecklistRun', (_e, tId: string) => content.getChecklistRun(tId))
  ipcMain.handle('content:toggleChecklistItem', (_e, tId: string, iId: string) => content.toggleChecklistItem(tId, iId))
  ipcMain.handle('content:resetChecklist', (_e, tId: string) => content.resetChecklist(tId))

  // --- app ---
  ipcMain.handle('app:isFirstRun', () => appConfig.isFirstRun())
  ipcMain.handle('app:completeOnboarding', () => appConfig.completeOnboarding())
  ipcMain.handle('app:getConfig', () => appConfig.getConfig())
  ipcMain.handle('app:updateConfig', (_e, patch: Partial<Parameters<typeof appConfig.updateConfig>[0]>) => appConfig.updateConfig(patch))
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

