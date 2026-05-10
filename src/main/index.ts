import { app, BrowserWindow, shell, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { MockAdapter } from './adapters/MockAdapter'
import { RealWindowsAdapter } from './adapters/RealWindowsAdapter'
import type { WindowsAdapter } from './adapters/WindowsAdapter'

// ── Single-instance lock — second launch focuses the existing window ─────────
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// ── Logging — writes to %APPDATA%\moms-pc-helper\logs\ on Windows ───────────
log.initialize()
log.transports.file.level = 'debug'
log.transports.console.level = 'debug'
log.info('App starting', { version: app.getVersion(), platform: process.platform })

// Catch any unhandled main-process exception before it silently kills the app
process.on('uncaughtException', (err) => {
  log.error('uncaughtException', err)
  dialog.showErrorBox('Something went wrong', `${err.message}\n\nCheck logs at:\n${log.transports.file.getFile().path}`)
})

process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection', reason)
})

function createAdapter(): WindowsAdapter {
  if (process.platform === 'win32') {
    log.info('Using RealWindowsAdapter')
    return new RealWindowsAdapter()
  }
  log.info('Using MockAdapter')
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

  // Show as soon as ready, or force-show after 10 s regardless
  const showWindow = (): void => {
    if (!mainWindow.isVisible()) {
      log.info('showing window')
      mainWindow.show()
    }
  }
  mainWindow.on('ready-to-show', showWindow)
  setTimeout(showWindow, 10_000)

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log.error('did-fail-load', { code, desc, url })
    showWindow()
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log.error('render-process-gone', details)
    showWindow()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const rendererPath = join(__dirname, '../renderer/index.html')
    log.info('Loading renderer', rendererPath)
    mainWindow.loadFile(rendererPath)
  }

  return mainWindow
}

app.on('second-instance', () => {
  // Someone tried to open a second instance — focus the existing window instead
  const [win] = BrowserWindow.getAllWindows()
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(() => {
  log.info('app ready')
  electronApp.setAppUserModelId('com.joelwilson.moms-pc-helper')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    const adapter = createAdapter()
    registerIpcHandlers(adapter)
    log.info('IPC handlers registered')
  } catch (e) {
    log.error('registerIpcHandlers failed', e)
  }

  const mainWindow = createWindow()

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.webContents.send('nav:advanced')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((e) => {
  log.error('app.whenReady failed', e)
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})
