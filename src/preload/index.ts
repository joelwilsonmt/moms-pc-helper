// Preload — contextBridge only. No ipcRenderer exposed to the renderer directly.
// The renderer calls window.api.<namespace>.<method>() and gets a Promise back.

import { contextBridge, ipcRenderer } from 'electron'
import type { IpcAPI } from '../shared/types'

const api: IpcAPI = {
  system: {
    getVolumes: () => ipcRenderer.invoke('system:getVolumes'),
    getPrinters: () => ipcRenderer.invoke('system:getPrinters'),
    getPrintJobs: () => ipcRenderer.invoke('system:getPrintJobs'),
    getInternetStatus: () => ipcRenderer.invoke('system:getInternetStatus'),
    getBackupStatus: () => ipcRenderer.invoke('system:getBackupStatus'),
    getInstalledPrograms: () => ipcRenderer.invoke('system:getInstalledPrograms'),
    getUpdatesAvailable: () => ipcRenderer.invoke('system:getUpdatesAvailable'),
    getFolderSizes: () => ipcRenderer.invoke('system:getFolderSizes')
  },

  launch: {
    settings: (uri) => ipcRenderer.invoke('launch:settings', uri),
    explorerFolder: (path) => ipcRenderer.invoke('launch:explorerFolder', path),
    url: (url) => ipcRenderer.invoke('launch:url', url)
  },

  vault: {
    isInitialized: () => ipcRenderer.invoke('vault:isInitialized'),
    initialize: (pw) => ipcRenderer.invoke('vault:initialize', pw),
    unlock: (pw) => ipcRenderer.invoke('vault:unlock', pw),
    unlockWithHello: () => ipcRenderer.invoke('vault:unlockWithHello'),
    lock: () => ipcRenderer.invoke('vault:lock'),
    list: (cat) => ipcRenderer.invoke('vault:list', cat),
    get: (id) => ipcRenderer.invoke('vault:get', id),
    create: (entry) => ipcRenderer.invoke('vault:create', entry),
    update: (id, patch) => ipcRenderer.invoke('vault:update', id, patch),
    delete: (id) => ipcRenderer.invoke('vault:delete', id),
    search: (q) => ipcRenderer.invoke('vault:search', q)
  },

  subs: {
    list: () => ipcRenderer.invoke('subs:list'),
    add: (sub) => ipcRenderer.invoke('subs:add', sub),
    update: (id, patch) => ipcRenderer.invoke('subs:update', id, patch),
    delete: (id) => ipcRenderer.invoke('subs:delete', id),
    detectOverlaps: () => ipcRenderer.invoke('subs:detectOverlaps')
  },

  scam: {
    analyze: (content) => ipcRenderer.invoke('scam:analyze', content),
    history: (limit) => ipcRenderer.invoke('scam:history', limit)
  },

  panic: {
    send: (message, includeScreenshot) =>
      ipcRenderer.invoke('panic:send', message, includeScreenshot),
    captureScreenshot: () => ipcRenderer.invoke('panic:captureScreenshot')
  },

  content: {
    listGuides: (cat) => ipcRenderer.invoke('content:listGuides', cat),
    getGuide: (id) => ipcRenderer.invoke('content:getGuide', id),
    searchGuides: (q) => ipcRenderer.invoke('content:searchGuides', q),
    listChecklists: () => ipcRenderer.invoke('content:listChecklists'),
    getChecklistRun: (tId) => ipcRenderer.invoke('content:getChecklistRun', tId),
    toggleChecklistItem: (tId, iId) =>
      ipcRenderer.invoke('content:toggleChecklistItem', tId, iId),
    resetChecklist: (tId) => ipcRenderer.invoke('content:resetChecklist', tId)
  },

  app: {
    isFirstRun: () => ipcRenderer.invoke('app:isFirstRun'),
    completeOnboarding: () => ipcRenderer.invoke('app:completeOnboarding'),
    getConfig: () => ipcRenderer.invoke('app:getConfig'),
    updateConfig: (patch) => ipcRenderer.invoke('app:updateConfig', patch),
    onNavAdvanced: (cb) => {
      const listener = (): void => cb()
      ipcRenderer.on('nav:advanced', listener)
      return () => ipcRenderer.off('nav:advanced', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
