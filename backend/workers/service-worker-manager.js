/**
 * Service Worker Manager
 * Manages multiple worker processes for network scanning and device monitoring
 */

const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const path = require('path');

class ServiceWorkerManager extends EventEmitter {
  constructor(deviceIntelligence = null) {
    super();
    this.workers = new Map();
    this.activeScans = new Map();
    this.scanCounter = 0;
    this.deviceIntelligence = deviceIntelligence;
  }

  /**
   * Start a new network scan in a separate worker process
   */
  async startNetworkScan(config) {
    const scanId = `scan_${++this.scanCounter}_${Date.now()}`;
    
    try {
      // Create new worker for this scan
      const workerPath = path.join(__dirname, 'network-scanner-worker.js');
      const worker = new Worker(workerPath);
      
      // Store worker reference
      this.workers.set(scanId, worker);
      this.activeScans.set(scanId, {
        startTime: Date.now(),
        config: config,
        status: 'running'
      });

      // Set up worker message handling
      worker.on('message', (message) => {
        this.handleWorkerMessage(scanId, message);
      });

      // Handle worker errors
      worker.on('error', (error) => {
        console.error(`Worker ${scanId} error:`, error);
        this.emit('scanError', { scanId, error: error.message });
        this.cleanupWorker(scanId);
      });

      // Handle worker exit
      worker.on('exit', (code) => {
        console.log(`Worker ${scanId} exited with code ${code}`);
        this.cleanupWorker(scanId);
      });

      // Start the scan
      worker.postMessage({
        type: 'scan',
        data: {
          scanId,
          ...config
        }
      });

      return scanId;
      
    } catch (error) {
      console.error('Failed to start network scan:', error);
      this.cleanupWorker(scanId);
      throw error;
    }
  }

  /**
   * Cancel an active scan
   */
  cancelScan(scanId) {
    const worker = this.workers.get(scanId);
    if (worker) {
      worker.postMessage({ type: 'cancel' });
      // Give worker 5 seconds to cleanup, then force terminate
      setTimeout(() => {
        this.terminateWorker(scanId);
      }, 5000);
    }
  }

  /**
   * Terminate a specific worker
   */
  terminateWorker(scanId) {
    const worker = this.workers.get(scanId);
    if (worker) {
      worker.postMessage({ type: 'terminate' });
      worker.terminate();
      this.cleanupWorker(scanId);
    }
  }

  /**
   * Terminate all workers
   */
  terminateAllWorkers() {
    for (const scanId of this.workers.keys()) {
      this.terminateWorker(scanId);
    }
  }

  /**
   * Get status of all active scans
   */
  getActiveScanStatus() {
    const status = {};
    for (const [scanId, scanInfo] of this.activeScans.entries()) {
      status[scanId] = {
        ...scanInfo,
        duration: Date.now() - scanInfo.startTime,
        hasWorker: this.workers.has(scanId)
      };
    }
    return status;
  }

  /**
   * Handle messages from worker threads
   */
  async handleWorkerMessage(scanId, message) {
    const { type } = message;
    
    switch (type) {
      case 'progress':
        this.emit('scanProgress', {
          scanId: message.scanId,
          message: message.message,
          progress: message.progress
        });
        
        // Update scan status
        const scanInfo = this.activeScans.get(scanId);
        if (scanInfo) {
          scanInfo.lastProgress = message.progress;
          scanInfo.lastMessage = message.message;
        }
        break;

      case 'result':
        // Enrich device data if device intelligence is available
        let enrichedData = message.data;
        if (this.deviceIntelligence && message.data && message.data.devices) {
          try {
            enrichedData = {
              ...message.data,
              devices: await Promise.all(
                message.data.devices.map(async (device) => {
                  return await this.deviceIntelligence.enrichDevice(device);
                })
              )
            };
          } catch (error) {
            console.error('Error enriching device data:', error);
            // Fall back to original data if enrichment fails
            enrichedData = message.data;
          }
        }

        this.emit('scanResult', {
          scanId: message.scanId,
          status: message.status,
          data: enrichedData
        });
        
        // Also emit completion event if scan is complete
        if (message.status === 'completed') {
          this.emit('scanComplete', {
            scanId: message.scanId,
            status: message.status
          });
        }
        
        // Update scan status
        const completedScanInfo = this.activeScans.get(scanId);
        if (completedScanInfo) {
          completedScanInfo.status = message.status;
          completedScanInfo.endTime = Date.now();
          completedScanInfo.duration = completedScanInfo.endTime - completedScanInfo.startTime;
        }
        
        // Cleanup worker after result
        setTimeout(() => this.cleanupWorker(scanId), 1000);
        break;

      default:
        console.log(`Unknown message type from worker ${scanId}:`, message);
    }
  }

  /**
   * Clean up worker resources
   */
  cleanupWorker(scanId) {
    const worker = this.workers.get(scanId);
    if (worker) {
      try {
        worker.terminate();
      } catch (error) {
        console.error(`Error terminating worker ${scanId}:`, error);
      }
      this.workers.delete(scanId);
    }

    // Keep scan info for a while for status queries, then remove
    setTimeout(() => {
      this.activeScans.delete(scanId);
    }, 30000); // Keep for 30 seconds
  }

  /**
   * Get worker statistics
   */
  getWorkerStats() {
    return {
      activeWorkers: this.workers.size,
      totalScans: this.scanCounter,
      activeScans: this.activeScans.size,
      workers: Array.from(this.workers.keys()),
      scans: Array.from(this.activeScans.keys())
    };
  }

  /**
   * Health check for all workers
   */
  async healthCheck() {
    const results = {};
    
    for (const [scanId, worker] of this.workers.entries()) {
      try {
        // Send ping to worker
        worker.postMessage({ type: 'ping' });
        results[scanId] = 'healthy';
      } catch (error) {
        results[scanId] = 'error';
        console.error(`Health check failed for worker ${scanId}:`, error);
      }
    }
    
    return results;
  }
}

module.exports = ServiceWorkerManager;
