const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { exec, spawn } = require('child_process');
const setupAuthHandlers = require('./auth-handlers');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let previewWindow;
let backendProcess;
let sshProcess;

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

// Backend control handlers
function setupBackendControlHandlers() {
  ipcMain.handle('control-backend', async (event, action, service) => {
    try {
      switch (service) {
        case 'backend':
          return await controlBackendService(action);
        case 'ssh':
          return await controlSSHService(action);
        case 'workers':
          // Workers are controlled by the backend server itself
          return { message: 'Workers are controlled by the backend server' };
        default:
          throw new Error('Invalid service');
      }
    } catch (error) {
      throw new Error(`Backend control failed: ${error.message}`);
    }
  });
}

async function controlBackendService(action) {
  return new Promise((resolve, reject) => {
    switch (action) {
      case 'start':
        if (backendProcess && !backendProcess.killed) {
          resolve({ message: 'Backend is already running' });
          return;
        }
        
        const backendPath = path.join(__dirname, '../backend/server.js');
        backendProcess = spawn('node', [backendPath], {
          stdio: 'pipe',
          cwd: path.dirname(backendPath)
        });
        
        backendProcess.on('spawn', () => {
          console.log('Backend server started');
          resolve({ message: 'Backend server started successfully' });
        });
        
        backendProcess.on('error', (error) => {
          console.error('Backend server error:', error);
          reject(new Error(`Failed to start backend: ${error.message}`));
        });
        
        backendProcess.on('exit', (code) => {
          console.log(`Backend server exited with code ${code}`);
          backendProcess = null;
        });
        break;
        
      case 'stop':
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill('SIGTERM');
          setTimeout(() => {
            if (backendProcess && !backendProcess.killed) {
              backendProcess.kill('SIGKILL');
            }
          }, 5000);
          resolve({ message: 'Backend server stopped' });
        } else {
          resolve({ message: 'Backend server is not running' });
        }
        break;
        
      case 'restart':
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill('SIGTERM');
          setTimeout(() => {
            controlBackendService('start').then(resolve).catch(reject);
          }, 2000);
        } else {
          controlBackendService('start').then(resolve).catch(reject);
        }
        break;
        
      default:
        reject(new Error('Invalid action'));
    }
  });
}

async function controlSSHService(action) {
  return new Promise((resolve, reject) => {
    switch (action) {
      case 'start':
        if (sshProcess && !sshProcess.killed) {
          resolve({ message: 'SSH server is already running' });
          return;
        }
        
        const sshPath = path.join(__dirname, '../backend/ssh-server.js');
        sshProcess = spawn('node', [sshPath], {
          stdio: 'pipe',
          cwd: path.dirname(sshPath)
        });
        
        sshProcess.on('spawn', () => {
          console.log('SSH server started');
          resolve({ message: 'SSH server started successfully' });
        });
        
        sshProcess.on('error', (error) => {
          console.error('SSH server error:', error);
          reject(new Error(`Failed to start SSH server: ${error.message}`));
        });
        
        sshProcess.on('exit', (code) => {
          console.log(`SSH server exited with code ${code}`);
          sshProcess = null;
        });
        break;
        
      case 'stop':
        if (sshProcess && !sshProcess.killed) {
          sshProcess.kill('SIGTERM');
          setTimeout(() => {
            if (sshProcess && !sshProcess.killed) {
              sshProcess.kill('SIGKILL');
            }
          }, 5000);
          resolve({ message: 'SSH server stopped' });
        } else {
          resolve({ message: 'SSH server is not running' });
        }
        break;
        
      case 'restart':
        if (sshProcess && !sshProcess.killed) {
          sshProcess.kill('SIGTERM');
          setTimeout(() => {
            controlSSHService('start').then(resolve).catch(reject);
          }, 2000);
        } else {
          controlSSHService('start').then(resolve).catch(reject);
        }
        break;
        
      default:
        reject(new Error('Invalid action'));
    }
  });
}

// App lifecycle events
app.on('ready', () => {
  createMainWindow();
  setupPreviewHandlers();
  setupBackendControlHandlers();
});

app.on('window-all-closed', () => {
  // Clean up backend processes
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  if (sshProcess && !sshProcess.killed) {
    sshProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
