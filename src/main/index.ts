import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { MockAdapter } from './adapters/MockAdapter'
import type { WindowsAdapter } from './adapters/WindowsAdapter'

function createAdapter(): WindowsAdapter {
  if (process.platform === 'win32') {
    // Real adapter wired in milestone 5
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RealWindowsAdapter } = require('./adapters/RealWindowsAdapter')
    return new RealWindowsAdapter()
  }
  return new MockAdapter()
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "Mom's PC Helper",
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.joel.moms-pc-helper')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const adapter = createAdapter()
  registerIpcHandlers(adapter)

  const mainWindow = createWindow()

  // Advanced panel — hidden behind Ctrl+Shift+A (§7.15)
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.webContents.send('nav:advanced')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})
