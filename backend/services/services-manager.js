/**
 * Comprehensive Services Manager
 * Manages all system services including backend, frontend, workers, and system processes
 * Provides real-time monitoring, restart capabilities, and maintenance operations
 */

const EventEmitter = require('events');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const si = require('systeminformation');

// Add fetch polyfill for Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class ServicesManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.monitoringIntervals = new Map();
    this.healthCheckInterval = null;
    this.serviceStates = new Map();
    this.restartAttempts = new Map();
    this.maxRestartAttempts = 3;
    this.restartCooldown = 30000; // 30 seconds
    
    this.initializeServices();
    this.startGlobalMonitoring();
  }

  /**
   * Initialize all system services
   */
  initializeServices() {
    const serviceConfigs = {
      backend: {
        name: 'Backend Server',
        type: 'nodejs',
        command: 'node',
        args: ['backend/server.js'],
        port: 8001,
        healthCheck: 'http://localhost:8001/health',
        autoRestart: true,
        critical: true,
        dependencies: []
      },
      frontend: {
        name: 'Frontend Development Server',
        type: 'webpack',
        command: 'npm',
        args: ['run', 'react:dev'],
        port: 3002,
        healthCheck: 'http://localhost:3002',
        autoRestart: true,
        critical: true,
        dependencies: []
      },
      electron: {
        name: 'Electron Application',
        type: 'electron',
        command: 'npm',
        args: ['run', 'electron:dev'],
        port: null,
        healthCheck: null,
        autoRestart: false,
        critical: false,
        dependencies: ['backend', 'frontend']
      },
      database: {
        name: 'SQLite Database Service',
        type: 'database',
        command: null,
        args: [],
        port: null,
        healthCheck: null,
        autoRestart: false,
        critical: true,
        dependencies: []
      },
      ssh: {
        name: 'SSH Server',
        type: 'ssh',
        command: null,
        args: [],
        port: 2222,
        healthCheck: null,
        autoRestart: true,
        critical: false,
        dependencies: []
      }
    };

    // Initialize service states
    for (const [serviceId, config] of Object.entries(serviceConfigs)) {
      this.serviceStates.set(serviceId, {
        ...config,
        status: 'stopped',
        pid: null,
        process: null,
        startTime: null,
        restartCount: 0,
        lastError: null,
        healthStatus: 'unknown',
        metrics: {
          cpu: 0,
          memory: 0,
          uptime: 0
        }
      });
      this.restartAttempts.set(serviceId, 0);
    }
  }

  /**
   * Start a specific service
   */
  async startService(serviceId) {
    const service = this.serviceStates.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (service.status === 'running') {
      return { success: true, message: `Service ${serviceId} is already running` };
    }

    try {
      // Check dependencies first
      await this.checkDependencies(serviceId);

      // Start the service based on its type
      const startResult = await this.startServiceProcess(serviceId, service);
      
      if (startResult.success) {
        service.status = 'running';
        service.startTime = Date.now();
        service.lastError = null;
        
        // Start monitoring for this service
        this.startServiceMonitoring(serviceId);
        
        this.emit('serviceStarted', { serviceId, service: service.name });
        return { success: true, message: `Service ${service.name} started successfully` };
      } else {
        throw new Error(startResult.error || 'Failed to start service');
      }
    } catch (error) {
      service.status = 'error';
      service.lastError = error.message;
      this.emit('serviceError', { serviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Stop a specific service
   */
  async stopService(serviceId) {
    const service = this.serviceStates.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (service.status === 'stopped') {
      return { success: true, message: `Service ${serviceId} is already stopped` };
    }

    try {
      await this.stopServiceProcess(serviceId, service);
      
      service.status = 'stopped';
      service.pid = null;
      service.process = null;
      service.startTime = null;
      
      // Stop monitoring
      this.stopServiceMonitoring(serviceId);
      
      this.emit('serviceStopped', { serviceId, service: service.name });
      return { success: true, message: `Service ${service.name} stopped successfully` };
    } catch (error) {
      service.status = 'error';
      service.lastError = error.message;
      this.emit('serviceError', { serviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Restart a specific service
   */
  async restartService(serviceId) {
    const service = this.serviceStates.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    try {
      // Stop the service first
      if (service.status === 'running') {
        await this.stopService(serviceId);
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Start the service
      const result = await this.startService(serviceId);
      service.restartCount++;
      
      this.emit('serviceRestarted', { serviceId, service: service.name });
      return result;
    } catch (error) {
      this.emit('serviceError', { serviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Start all services
   */
  async startAllServices() {
    const results = {};
    const serviceOrder = ['database', 'backend', 'frontend', 'ssh', 'electron'];
    
    for (const serviceId of serviceOrder) {
      try {
        results[serviceId] = await this.startService(serviceId);
        // Wait between service starts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results[serviceId] = { success: false, error: error.message };
      }
    }
    
    this.emit('allServicesStarted', results);
    return results;
  }

  /**
   * Stop all services
   */
  async stopAllServices() {
    const results = {};
    const serviceOrder = ['electron', 'frontend', 'backend', 'ssh', 'database'];
    
    for (const serviceId of serviceOrder) {
      try {
        results[serviceId] = await this.stopService(serviceId);
      } catch (error) {
        results[serviceId] = { success: false, error: error.message };
      }
    }
    
    this.emit('allServicesStopped', results);
    return results;
  }

  /**
   * Restart all services
   */
  async restartAllServices() {
    try {
      await this.stopAllServices();
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await this.startAllServices();
    } catch (error) {
      this.emit('servicesError', { error: error.message });
      throw error;
    }
  }

  /**
   * Start service process based on type
   */
  async startServiceProcess(serviceId, service) {
    switch (service.type) {
      case 'nodejs':
      case 'webpack':
      case 'electron':
        return this.startNodeProcess(serviceId, service);
      
      case 'database':
        return this.startDatabaseService(serviceId, service);
      
      case 'ssh':
        return this.startSSHService(serviceId, service);
      
      default:
        throw new Error(`Unknown service type: ${service.type}`);
    }
  }

  /**
   * Start Node.js process
   */
  async startNodeProcess(serviceId, service) {
    return new Promise((resolve, reject) => {
      try {
        const childProcess = spawn(service.command, service.args, {
          cwd: path.join(__dirname, '../..'),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'development' }
        });

        service.process = childProcess;
        service.pid = childProcess.pid;

        // Handle process output
        childProcess.stdout.on('data', (data) => {
          this.emit('serviceOutput', { 
            serviceId, 
            type: 'stdout', 
            data: data.toString() 
          });
        });

        childProcess.stderr.on('data', (data) => {
          this.emit('serviceOutput', { 
            serviceId, 
            type: 'stderr', 
            data: data.toString() 
          });
        });

        // Handle process exit
        childProcess.on('exit', (code) => {
          this.handleServiceExit(serviceId, code);
        });

        childProcess.on('error', (error) => {
          reject(new Error(`Failed to start ${service.name}: ${error.message}`));
        });

        // Wait for service to be ready
        setTimeout(() => {
          if (childProcess.pid) {
            resolve({ success: true });
          } else {
            reject(new Error(`Process failed to start`));
          }
        }, 2000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start database service
   */
  async startDatabaseService(serviceId, service) {
    try {
      // Database is file-based SQLite, just check if files exist
      const dbPath = path.join(__dirname, '../database');
      await fs.access(dbPath);
      return { success: true };
    } catch (error) {
      // Create database directory if it doesn't exist
      await fs.mkdir(path.join(__dirname, '../database'), { recursive: true });
      return { success: true };
    }
  }

  /**
   * Start SSH service
   */
  async startSSHService(serviceId, service) {
    // SSH service is typically managed by the main process
    // We'll mark it as running if port 2222 is listening
    try {
      const netstat = await execAsync('netstat -an | grep :2222');
      if (netstat.stdout.includes('LISTEN')) {
        return { success: true };
      } else {
        throw new Error('SSH port not listening');
      }
    } catch (error) {
      return { success: false, error: 'SSH service not available' };
    }
  }

  /**
   * Stop service process
   */
  async stopServiceProcess(serviceId, service) {
    if (service.process && service.pid) {
      return new Promise((resolve) => {
        service.process.on('exit', () => {
          resolve();
        });

        // Try graceful shutdown first
        service.process.kill('SIGTERM');

        // Force kill after 10 seconds
        setTimeout(() => {
          if (service.process && !service.process.killed) {
            service.process.kill('SIGKILL');
          }
          resolve();
        }, 10000);
      });
    }
  }

  /**
   * Handle service exit
   */
  handleServiceExit(serviceId, code) {
    const service = this.serviceStates.get(serviceId);
    if (!service) return;

    service.status = code === 0 ? 'stopped' : 'crashed';
    service.process = null;
    service.pid = null;

    this.emit('serviceExited', { 
      serviceId, 
      service: service.name, 
      code,
      status: service.status 
    });

    // Auto-restart if enabled and not too many attempts
    if (service.autoRestart && service.status === 'crashed') {
      this.attemptAutoRestart(serviceId);
    }
  }

  /**
   * Attempt auto-restart with backoff
   */
  async attemptAutoRestart(serviceId) {
    const attempts = this.restartAttempts.get(serviceId) || 0;
    
    if (attempts >= this.maxRestartAttempts) {
      this.emit('serviceRestartFailed', { 
        serviceId, 
        reason: 'Max restart attempts exceeded' 
      });
      return;
    }

    this.restartAttempts.set(serviceId, attempts + 1);
    
    // Exponential backoff
    const delay = Math.min(this.restartCooldown * Math.pow(2, attempts), 300000); // Max 5 minutes
    
    setTimeout(async () => {
      try {
        await this.startService(serviceId);
        this.restartAttempts.set(serviceId, 0); // Reset on success
        this.emit('serviceAutoRestarted', { serviceId });
      } catch (error) {
        this.emit('serviceRestartError', { serviceId, error: error.message });
        this.attemptAutoRestart(serviceId); // Try again
      }
    }, delay);
  }

  /**
   * Check service dependencies
   */
  async checkDependencies(serviceId) {
    const service = this.serviceStates.get(serviceId);
    if (!service || !service.dependencies.length) return;

    for (const depId of service.dependencies) {
      const dependency = this.serviceStates.get(depId);
      if (!dependency || dependency.status !== 'running') {
        throw new Error(`Dependency ${depId} is not running`);
      }
    }
  }

  /**
   * Start monitoring for a specific service
   */
  startServiceMonitoring(serviceId) {
    const interval = setInterval(async () => {
      await this.updateServiceMetrics(serviceId);
    }, 5000);
    
    this.monitoringIntervals.set(serviceId, interval);
  }

  /**
   * Stop monitoring for a specific service
   */
  stopServiceMonitoring(serviceId) {
    const interval = this.monitoringIntervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(serviceId);
    }
  }

  /**
   * Update metrics for a service
   */
  async updateServiceMetrics(serviceId) {
    const service = this.serviceStates.get(serviceId);
    if (!service || !service.pid) return;

    try {
      // Get process metrics
      const processes = await si.processes();
      const processInfo = processes.list.find(p => p.pid === service.pid);
      
      if (processInfo) {
        service.metrics = {
          cpu: processInfo.cpu || 0,
          memory: processInfo.memory || 0,
          uptime: service.startTime ? Date.now() - service.startTime : 0
        };
      }

      // Health check if URL provided
      if (service.healthCheck) {
        try {
          const response = await fetch(service.healthCheck);
          service.healthStatus = response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
          service.healthStatus = 'unhealthy';
        }
      }

      this.emit('serviceMetricsUpdated', { serviceId, metrics: service.metrics });
    } catch (error) {
      console.error(`Error updating metrics for ${serviceId}:`, error);
    }
  }

  /**
   * Start global monitoring
   */
  startGlobalMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performGlobalHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform global health check
   */
  async performGlobalHealthCheck() {
    const systemHealth = {
      timestamp: Date.now(),
      services: {},
      systemMetrics: {}
    };

    // Check each service
    for (const [serviceId, service] of this.serviceStates.entries()) {
      systemHealth.services[serviceId] = {
        status: service.status,
        healthStatus: service.healthStatus,
        uptime: service.startTime ? Date.now() - service.startTime : 0,
        restartCount: service.restartCount,
        metrics: service.metrics
      };
    }

    // Get system metrics
    try {
      const [cpu, memory, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.currentLoad()
      ]);

      systemHealth.systemMetrics = {
        cpu: load.currentLoad,
        memory: {
          used: memory.used,
          total: memory.total,
          percentage: (memory.used / memory.total) * 100
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
    }

    this.emit('globalHealthCheck', systemHealth);
  }

  /**
   * Get current status of all services
   */
  getServicesStatus() {
    const status = {};
    for (const [serviceId, service] of this.serviceStates.entries()) {
      status[serviceId] = {
        name: service.name,
        type: service.type,
        status: service.status,
        healthStatus: service.healthStatus,
        pid: service.pid,
        port: service.port,
        startTime: service.startTime,
        uptime: service.startTime ? Date.now() - service.startTime : 0,
        restartCount: service.restartCount,
        lastError: service.lastError,
        metrics: service.metrics,
        autoRestart: service.autoRestart,
        critical: service.critical
      };
    }
    return status;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      totalServices: this.serviceStates.size,
      runningServices: Array.from(this.serviceStates.values()).filter(s => s.status === 'running').length,
      crashedServices: Array.from(this.serviceStates.values()).filter(s => s.status === 'crashed').length,
      monitoringIntervals: this.monitoringIntervals.size,
      uptime: process.uptime()
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    // Stop global monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all service monitoring
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }

    // Stop all services
    await this.stopAllServices();
    
    this.emit('servicesManagerShutdown');
  }
}

module.exports = ServicesManager;
