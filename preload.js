const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System monitoring APIs
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),
  getServiceHealth: () => ipcRenderer.invoke('get-service-health'),
  getHeapInfo: () => ipcRenderer.invoke('get-heap-info'),
  
  // Window management
  openPreviewWindow: () => ipcRenderer.invoke('open-preview-window'),
  sendToPreview: (data) => ipcRenderer.invoke('send-to-preview', data),
  
  // Event listeners
  onSystemUpdate: (callback) => {
    ipcRenderer.on('system-update', (event, data) => callback(data));
  },
  
  onPreviewData: (callback) => {
    ipcRenderer.on('preview-data', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
