const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const setupAuthHandlers = require('./auth-handlers');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let previewWindow;

// Create the main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: process.env.NODE_ENV === 'production', // Disable in dev for easier testing
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../build/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  mainWindow.loadURL(startUrl);

  // Open DevTools automatically in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Set up auth handlers
  setupAuthHandlers(mainWindow);

  // Clean up on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (previewWindow) {
      previewWindow.close();
      previewWindow = null;
    }
  });
}

// Create the preview window for real-time previewing
function createPreviewWindow() {
  previewWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Load a blank page initially
  previewWindow.loadURL('about:blank');

  // Clean up on window close
  previewWindow.on('closed', () => {
    previewWindow = null;
    // Notify the main window that preview is closed
    if (mainWindow) {
      mainWindow.webContents.send('preview-closed');
    }
  });

  return previewWindow;
}

// IPC handlers for preview window
function setupPreviewHandlers() {
  ipcMain.handle('create-preview-window', () => {
    if (!previewWindow) {
      createPreviewWindow();
    }
    return true;
  });

  ipcMain.handle('load-preview-content', (event, { html }) => {
    if (previewWindow) {
      previewWindow.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      return true;
    }
    return false;
  });

  ipcMain.handle('close-preview-window', () => {
    if (previewWindow) {
      previewWindow.close();
      previewWindow = null;
      return true;
    }
    return false;
  });
}

// App lifecycle events
app.on('ready', () => {
  createMainWindow();
  setupPreviewHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
