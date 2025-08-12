const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const si = require('systeminformation');
const pidusage = require('pidusage');
const SSHServer = require('./backend/ssh-server');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.previewWindow = null;
    this.backendProcess = null;
    this.sshServer = null;
    this.services = new Map();
    this.isDev = process.env.NODE_ENV === 'development';
    
    this.init();
  }

  init() {
    app.whenReady().then(async () => {
      this.createMainWindow();
      this.startBackendServer();
      await this.startSSHServer();
      this.setupIPC();
      this.startSystemMonitoring();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true, // Always enable web security
        allowRunningInsecureContent: false, // Don't allow insecure content
        preload: path.join(__dirname, 'preload.js')
      }
    });

    const indexPath = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../dist/index.html')}`;
    
    this.mainWindow.loadURL(indexPath);

    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  createPreviewWindow() {
    if (this.previewWindow) {
      this.previewWindow.focus();
      return;
    }

    this.previewWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: this.mainWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true, // Always enable web security
        allowRunningInsecureContent: false, // Don't allow insecure content
        preload: path.join(__dirname, 'preload.js')
      }
    });

    const previewPath = this.isDev 
      ? 'http://localhost:3001/preview' 
      : `file://${path.join(__dirname, '../dist/preview.html')}`;
    
    this.previewWindow.loadURL(previewPath);

    this.previewWindow.on('closed', () => {
      this.previewWindow = null;
    });
  }

  startBackendServer() {
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    this.backendProcess = spawn('node', [serverPath], {
      stdio: 'pipe',
      env: { ...process.env, PORT: 3001 }
    });

    this.services.set('backend', {
      pid: this.backendProcess.pid,
      name: 'Express Backend',
      status: 'running',
      startTime: Date.now()
    });

    this.backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    this.backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    this.backendProcess.on('close', (code) => {
      console.log(`Backend process closed with code ${code}`);
      this.services.delete('backend');
    });
  }

  setupIPC() {
    // System info requests
    ipcMain.handle('get-system-info', async () => {
      try {
        const [cpu, mem, osInfo, processes] = await Promise.all([
          si.cpu(),
          si.mem(),
          si.osInfo(),
          si.processes()
        ]);
        
        return { cpu, mem, osInfo, processes: processes.list.slice(0, 10) };
      } catch (error) {
        console.error('Error getting system info:', error);
        return null;
      }
    });

    // Real-time system metrics
    ipcMain.handle('get-system-metrics', async () => {
      try {
        const [cpuLoad, memInfo, networkStats] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.networkStats()
        ]);
        
        return { cpuLoad, memInfo, networkStats };
      } catch (error) {
        console.error('Error getting system metrics:', error);
        return null;
      }
    });

    // Service health monitoring
    ipcMain.handle('get-service-health', async () => {
      const healthData = [];
      
      for (const [serviceName, service] of this.services) {
        try {
          const stats = await pidusage(service.pid);
          healthData.push({
            name: service.name,
            pid: service.pid,
            status: service.status,
            cpu: stats.cpu,
            memory: stats.memory,
            uptime: Date.now() - service.startTime
          });
        } catch (error) {
          healthData.push({
            name: service.name,
            pid: service.pid,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return healthData;
    });

    // Heap monitoring for main process
    ipcMain.handle('get-heap-info', async () => {
      const memUsage = process.memoryUsage();
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      };
    });

    // Open preview window
    ipcMain.handle('open-preview-window', () => {
      this.createPreviewWindow();
      return true;
    });

    // Send data to preview window
    ipcMain.handle('send-to-preview', (event, data) => {
      if (this.previewWindow) {
        this.previewWindow.webContents.send('preview-data', data);
        return true;
      }
      return false;
    });
  }

  startSystemMonitoring() {
    // Send real-time system data every 2 seconds
    setInterval(async () => {
      if (this.mainWindow) {
        try {
          const [metrics, heapInfo, serviceHealth] = await Promise.all([
            this.getSystemMetrics(),
            this.getHeapInfo(),
            this.getServiceHealth()
          ]);
          
          this.mainWindow.webContents.send('system-update', {
            metrics,
            heapInfo,
            serviceHealth,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error in system monitoring:', error);
        }
      }
    }, 2000);
  }

  async getSystemMetrics() {
    const [cpuLoad, memInfo] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);
    return { cpuLoad, memInfo };
  }

  async getHeapInfo() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  async getServiceHealth() {
    const healthData = [];
    
    for (const [serviceName, service] of this.services) {
      try {
        const stats = await pidusage(service.pid);
        healthData.push({
          name: service.name,
          pid: service.pid,
          status: service.status,
          cpu: stats.cpu,
          memory: stats.memory,
          uptime: Date.now() - service.startTime
        });
      } catch (error) {
        healthData.push({
          name: service.name,
          pid: service.pid,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return healthData;
  }

  cleanup() {
    if (this.backendProcess) {
      this.backendProcess.kill();
    }
    
    if (this.sshServer) {
      this.sshServer.stop();
    }
  }
  
  async startSSHServer() {
    try {
      this.sshServer = new SSHServer();
      await this.sshServer.init();
      await this.sshServer.start(2222);
      
      this.services.set('ssh-server', {
        pid: process.pid, // Same as main process
        name: 'SSH Server',
        status: 'running',
        startTime: Date.now()
      });
      
      console.log('SSH server started successfully on port 2222');
    } catch (error) {
      console.error('Failed to start SSH server:', error);
    }
  }
}

new ElectronApp();
