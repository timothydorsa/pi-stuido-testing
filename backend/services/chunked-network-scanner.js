/**
 * Chunked Network Scanner Service
 * Provides faster network discovery by distributing scan work across multiple service chunks
 */

const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const path = require('path');

class ChunkedNetworkScanner extends EventEmitter {
  constructor(servicesManager) {
    super();
    this.servicesManager = servicesManager;
    this.activeScans = new Map();
    this.workerPool = [];
    this.maxWorkers = 4; // Maximum concurrent scan workers
    this.chunkSize = 64; // IPs per chunk
    this.scanResults = new Map();
    
    this.initializeWorkerPool();
  }

  /**
   * Initialize worker pool for parallel scanning
   */
  initializeWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workerPool.push({
        id: i,
        worker: null,
        busy: false,
        scanId: null
      });
    }
  }

  /**
   * Start a chunked network scan
   */
  async startChunkedScan(config) {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { subnet, cidr = 24, portScan = false, ports = [22, 80, 443, 8080] } = config;

    try {
      // Calculate IP chunks
      const chunks = this.calculateIPChunks(subnet, cidr);
      
      const scanData = {
        scanId,
        config,
        chunks,
        totalChunks: chunks.length,
        completedChunks: 0,
        results: [],
        startTime: Date.now(),
        status: 'running'
      };

      this.activeScans.set(scanId, scanData);
      
      // Emit scan started event
      this.emit('scanStarted', {
        scanId,
        totalChunks: chunks.length,
        estimatedTime: this.estimateScanTime(chunks.length, portScan),
        timestamp: new Date().toISOString()
      });

      // Start service instances for each chunk
      await this.spawnScanServices(scanData);

      return scanId;
    } catch (error) {
      this.emit('scanError', {
        scanId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Calculate IP address chunks for parallel scanning
   */
  calculateIPChunks(subnet, cidr) {
    const chunks = [];
    const [baseIP] = subnet.split('/');
    const [oct1, oct2, oct3, oct4] = baseIP.split('.').map(Number);
    
    // Calculate host range based on CIDR
    const hostBits = 32 - cidr;
    const totalHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
    const maxHosts = Math.min(totalHosts, 254); // Limit to reasonable size
    
    // Create chunks
    for (let start = 1; start <= maxHosts; start += this.chunkSize) {
      const end = Math.min(start + this.chunkSize - 1, maxHosts);
      const chunkIPs = [];
      
      for (let i = start; i <= end; i++) {
        if (cidr >= 24) {
          // Single subnet
          chunkIPs.push(`${oct1}.${oct2}.${oct3}.${i}`);
        } else {
          // Multiple subnets - simplified for now
          chunkIPs.push(`${oct1}.${oct2}.${oct3}.${i}`);
        }
      }
      
      chunks.push({
        id: chunks.length,
        startIP: chunkIPs[0],
        endIP: chunkIPs[chunkIPs.length - 1],
        ips: chunkIPs,
        status: 'pending'
      });
    }
    
    return chunks;
  }

  /**
   * Spawn scan services for each chunk
   */
  async spawnScanServices(scanData) {
    const { scanId, chunks, config } = scanData;
    
    // Process chunks in parallel using available workers
    const chunkPromises = chunks.map((chunk, index) => {
      return this.processChunk(scanId, chunk, config, index);
    });

    // Wait for all chunks to complete
    try {
      await Promise.allSettled(chunkPromises);
      
      // Finalize scan
      this.finalizeScan(scanId);
    } catch (error) {
      this.emit('scanError', {
        scanId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process a single chunk
   */
  async processChunk(scanId, chunk, config, chunkIndex) {
    return new Promise((resolve, reject) => {
      // Find available worker or wait
      const workerSlot = this.getAvailableWorker();
      
      if (!workerSlot) {
        // Queue for later processing
        setTimeout(() => {
          this.processChunk(scanId, chunk, config, chunkIndex).then(resolve).catch(reject);
        }, 1000);
        return;
      }

      // Create service for this chunk
      const serviceId = `network_scan_${scanId}_chunk_${chunkIndex}`;
      
      // Register temporary service with services manager
      this.registerScanService(serviceId, chunk);

      // Create worker for this chunk
      const worker = new Worker(path.join(__dirname, '../workers/network-scanner-worker.js'), {
        workerData: {
          scanId,
          chunkId: chunk.id,
          ips: chunk.ips,
          config
        }
      });

      workerSlot.worker = worker;
      workerSlot.busy = true;
      workerSlot.scanId = scanId;
      chunk.status = 'scanning';

      worker.on('message', (data) => {
        this.handleWorkerMessage(scanId, chunk, data);
      });

      worker.on('error', (error) => {
        console.error(`Worker error for chunk ${chunk.id}:`, error);
        chunk.status = 'error';
        this.releaseWorker(workerSlot);
        reject(error);
      });

      worker.on('exit', (code) => {
        chunk.status = code === 0 ? 'completed' : 'error';
        this.releaseWorker(workerSlot);
        this.unregisterScanService(serviceId);
        
        if (code === 0) {
          this.updateScanProgress(scanId);
          resolve();
        } else {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Register a temporary scan service with the services manager
   */
  registerScanService(serviceId, chunk) {
    const service = {
      name: `Network Scan Chunk ${chunk.id}`,
      type: 'scanner',
      status: 'running',
      pid: null,
      port: null,
      startTime: Date.now(),
      uptime: 0,
      restartCount: 0,
      lastError: null,
      metrics: { cpu: 0, memory: 0, uptime: 0 },
      autoRestart: false,
      critical: false,
      temporary: true,
      chunkData: chunk
    };

    // Add to services manager if available
    if (this.servicesManager && this.servicesManager.services) {
      this.servicesManager.services.set(serviceId, service);
      
      // Emit service started event
      this.servicesManager.emit('serviceStarted', {
        serviceId,
        service: service.name,
        temporary: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Unregister a temporary scan service
   */
  unregisterScanService(serviceId) {
    if (this.servicesManager && this.servicesManager.services) {
      const service = this.servicesManager.services.get(serviceId);
      if (service && service.temporary) {
        this.servicesManager.services.delete(serviceId);
        
        // Emit service stopped event
        this.servicesManager.emit('serviceStopped', {
          serviceId,
          service: service.name,
          temporary: true,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Get available worker from pool
   */
  getAvailableWorker() {
    return this.workerPool.find(worker => !worker.busy) || null;
  }

  /**
   * Release worker back to pool
   */
  releaseWorker(workerSlot) {
    if (workerSlot.worker) {
      workerSlot.worker.terminate();
    }
    workerSlot.worker = null;
    workerSlot.busy = false;
    workerSlot.scanId = null;
  }

  /**
   * Handle messages from worker threads
   */
  handleWorkerMessage(scanId, chunk, data) {
    const scanData = this.activeScans.get(scanId);
    if (!scanData) return;

    switch (data.type) {
      case 'progress':
        this.emit('chunkProgress', {
          scanId,
          chunkId: chunk.id,
          progress: data.progress,
          message: data.message,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'device_found':
        scanData.results.push(data.device);
        this.emit('deviceFound', {
          scanId,
          chunkId: chunk.id,
          device: data.device,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'chunk_complete':
        chunk.results = data.results;
        chunk.status = 'completed';
        break;
    }
  }

  /**
   * Update overall scan progress
   */
  updateScanProgress(scanId) {
    const scanData = this.activeScans.get(scanId);
    if (!scanData) return;

    scanData.completedChunks++;
    const progress = (scanData.completedChunks / scanData.totalChunks) * 100;

    this.emit('scanProgress', {
      scanId,
      progress: Math.round(progress),
      completedChunks: scanData.completedChunks,
      totalChunks: scanData.totalChunks,
      devicesFound: scanData.results.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Finalize scan when all chunks complete
   */
  finalizeScan(scanId) {
    const scanData = this.activeScans.get(scanId);
    if (!scanData) return;

    scanData.status = 'completed';
    scanData.endTime = Date.now();
    scanData.duration = scanData.endTime - scanData.startTime;

    // Consolidate results from all chunks
    const allResults = [];
    for (const chunk of scanData.chunks) {
      if (chunk.results) {
        allResults.push(...chunk.results);
      }
    }

    scanData.consolidatedResults = allResults;

    this.emit('scanCompleted', {
      scanId,
      totalDevices: allResults.length,
      duration: scanData.duration,
      results: allResults,
      timestamp: new Date().toISOString()
    });

    // Store results for later retrieval
    this.scanResults.set(scanId, scanData);
  }

  /**
   * Estimate scan time based on chunks and configuration
   */
  estimateScanTime(chunkCount, portScan) {
    const baseTimePerChunk = 5; // seconds
    const portScanMultiplier = portScan ? 3 : 1;
    const parallelism = Math.min(chunkCount, this.maxWorkers);
    
    return Math.ceil((chunkCount / parallelism) * baseTimePerChunk * portScanMultiplier);
  }

  /**
   * Get scan status
   */
  getScanStatus(scanId) {
    return this.activeScans.get(scanId) || this.scanResults.get(scanId);
  }

  /**
   * Stop an active scan
   */
  async stopScan(scanId) {
    const scanData = this.activeScans.get(scanId);
    if (!scanData) {
      throw new Error(`Scan ${scanId} not found`);
    }

    scanData.status = 'stopped';

    // Terminate all workers for this scan
    for (const workerSlot of this.workerPool) {
      if (workerSlot.scanId === scanId && workerSlot.worker) {
        await workerSlot.worker.terminate();
        this.releaseWorker(workerSlot);
      }
    }

    // Clean up temporary services
    if (this.servicesManager && this.servicesManager.services) {
      const servicesToRemove = [];
      for (const [serviceId, service] of this.servicesManager.services.entries()) {
        if (service.temporary && serviceId.includes(scanId)) {
          servicesToRemove.push(serviceId);
        }
      }
      
      for (const serviceId of servicesToRemove) {
        this.unregisterScanService(serviceId);
      }
    }

    this.emit('scanStopped', {
      scanId,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Terminate all workers
    for (const workerSlot of this.workerPool) {
      if (workerSlot.worker) {
        workerSlot.worker.terminate();
      }
    }
    
    // Clear active scans
    this.activeScans.clear();
  }
}

module.exports = ChunkedNetworkScanner;
