/**
 * Enhanced Services Manager with Process Integration
 * Tracks actual running processes and provides cohesive service management
 */

const EventEmitter = require('events');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const si = require('systeminformation');

class EnhancedServicesManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.runningProcesses = new Map();
    this.monitoringIntervals = new Map();
    this.healthCheckInterval = null;
    this.processDiscoveryInterval = null;
    this.startTime = Date.now();
    
    this.initializeServices();
    this.startProcessDiscovery();
    this.startGlobalMonitoring();
  }

  /**
   * Initialize all system services with enhanced tracking
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
        processNames: ['node', 'backend/server.js', 'nodemon'],
        status: 'unknown',
        pid: null,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastError: null,
        metrics: { cpu: 0, memory: 0, uptime: 0 },
        healthStatus: 'unknown'
      },
      frontend: {
        name: 'Frontend Development Server',
        type: 'webpack',
        command: 'webpack',
        args: ['serve', '--config', 'webpack.config.js'],
        port: 3002,
        healthCheck: 'http://localhost:3002',
        autoRestart: true,
        critical: true,
        processNames: ['webpack', 'webpack-dev-server', 'npm'],
        status: 'unknown',
        pid: null,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastError: null,
        metrics: { cpu: 0, memory: 0, uptime: 0 },
        healthStatus: 'unknown'
      },
      electron: {
        name: 'Electron Application',
        type: 'electron',
        command: 'electron',
        args: ['.'],
        port: null,
        healthCheck: null,
        autoRestart: false,
        critical: false,
        processNames: ['electron', 'Electron'],
        status: 'unknown',
        pid: null,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastError: null,
        metrics: { cpu: 0, memory: 0, uptime: 0 },
        healthStatus: 'unknown'
      },
      database: {
        name: 'Database Manager Service',
        type: 'database',
        command: null,
        args: [],
        port: null,
        healthCheck: 'http://localhost:8001/api/database/stats',
        autoRestart: false,
        critical: true,
        processNames: [],
        status: 'running', // Database is always running since it's integrated
        pid: process.pid, // Use the backend server PID since database is integrated
        startTime: Date.now(),
        uptime: 0,
        restartCount: 0,
        lastError: null,
        metrics: { cpu: 0, memory: 0, uptime: 0 },
        healthStatus: 'healthy'
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
        processNames: ['ssh', 'sshd'],
        status: 'unknown',
        pid: null,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastError: null,
        metrics: { cpu: 0, memory: 0, uptime: 0 },
        healthStatus: 'unknown'
      }
    };

    // Initialize services
    for (const [serviceId, config] of Object.entries(serviceConfigs)) {
      this.services.set(serviceId, config);
    }
  }

  /**
   * Start process discovery to track actual running processes
   */
  startProcessDiscovery() {
    this.processDiscoveryInterval = setInterval(async () => {
      await this.discoverRunningProcesses();
    }, 2000); // Check every 2 seconds

    // Initial discovery
    this.discoverRunningProcesses();
  }

  /**
   * Discover and track actual running processes using multiple methods
   */
  async discoverRunningProcesses() {
    try {
      // Use both systeminformation and direct process checking
      const [siProcesses, manualProcesses] = await Promise.all([
        si.processes(),
        this.getProcessesViaPS()
      ]);
      
      const runningProcs = new Map();

      // Check each service against running processes
      for (const [serviceId, service] of this.services.entries()) {
        let foundProcess = null;

        // Handle integrated services that don't have separate processes
        if (service.type === 'database' || service.type === 'service') {
          // These services are integrated into the backend server
          foundProcess = {
            pid: process.pid,
            command: 'integrated-service',
            name: service.name,
            cpu: 0,
            mem: 0.1 // Small memory footprint
          };
        } else {
          // First try systeminformation processes
          for (const proc of siProcesses.list) {
            if (this.isServiceProcess(proc, service)) {
              foundProcess = proc;
              break;
            }
          }

          // If not found, try manual process detection
          if (!foundProcess && manualProcesses.length > 0) {
            for (const proc of manualProcesses) {
              if (this.isServiceProcessManual(proc, service)) {
                foundProcess = {
                  pid: proc.pid,
                  command: proc.command,
                  name: proc.name,
                  cpu: 0, // Will be updated later
                  mem: 0  // Will be updated later
                };
                break;
              }
            }
          }
        }

        if (foundProcess) {
          // Update service status
          const wasRunning = service.status === 'running';
          service.status = 'running';
          service.pid = foundProcess.pid;
          service.startTime = service.startTime || Date.now();
          service.uptime = Date.now() - service.startTime;
          service.metrics = {
            cpu: foundProcess.cpu || 0,
            memory: foundProcess.mem || 0,
            uptime: service.uptime
          };

          runningProcs.set(serviceId, foundProcess);

          // Emit event if service just started
          if (!wasRunning) {
            this.emit('serviceStarted', {
              serviceId,
              service: service.name,
              pid: foundProcess.pid,
              timestamp: new Date().toISOString()
            });
          }
        } else if (service.status === 'running') {
          // Service was running but no longer found
          service.status = 'stopped';
          service.pid = null;
          service.uptime = 0;
          service.metrics = { cpu: 0, memory: 0, uptime: 0 };

          this.emit('serviceStopped', {
            serviceId,
            service: service.name,
            timestamp: new Date().toISOString()
          });
        }
      }

      this.runningProcesses = runningProcs;
      
      // Check health for running services
      await this.performHealthChecks();

    } catch (error) {
      console.error('Error during process discovery:', error);
    }
  }

  /**
   * Check if a process belongs to a service
   */
  isServiceProcess(process, service) {
    const cmd = process.command.toLowerCase();
    const name = process.name.toLowerCase();
    
    // Skip services without processNames (like temporary scanner services)
    if (!service.processNames || !Array.isArray(service.processNames)) {
      return false;
    }
    
    // Check for port matches
    if (service.port && process.pid) {
      // This would require netstat or lsof check - simplified for now
    }

    // Check process names
    for (const processName of service.processNames) {
      if (cmd.includes(processName.toLowerCase()) || 
          name.includes(processName.toLowerCase())) {
        
        // Additional validation for specific services
        if (service.type === 'nodejs' && cmd.includes('node')) {
          return cmd.includes('server.js') || cmd.includes('nodemon');
        }
        if (service.type === 'webpack' && (cmd.includes('webpack') || cmd.includes('npm'))) {
          return cmd.includes('webpack') || cmd.includes('react:dev');
        }
        if (service.type === 'electron' && cmd.includes('electron')) {
          return true;
        }
        
        return true;
      }
    }

    return false;
  }

  /**
   * Perform health checks on running services
   */
  async performHealthChecks() {
    for (const [serviceId, service] of this.services.entries()) {
      if (service.status === 'running' && service.healthCheck) {
        try {
          const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
          const response = await fetch(service.healthCheck, { 
            timeout: 3000,
            signal: AbortSignal.timeout(3000)
          });
          
          service.healthStatus = response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
          service.healthStatus = 'unhealthy';
        }
      } else if (service.status === 'running') {
        service.healthStatus = 'healthy'; // No health check available
      } else {
        service.healthStatus = 'unknown';
      }
    }
  }

  /**
   * Start global monitoring
   */
  startGlobalMonitoring() {
    // Overall health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const healthData = await this.getGlobalHealth();
      this.emit('globalHealthCheck', healthData);
    }, 30000);
  }

  /**
   * Get services status
   */
  getServicesStatus() {
    const services = {};
    for (const [serviceId, service] of this.services.entries()) {
      services[serviceId] = { ...service };
    }
    return services;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const services = Array.from(this.services.values());
    const runningServices = services.filter(s => s.status === 'running').length;
    const crashedServices = services.filter(s => s.status === 'crashed').length;
    
    return {
      totalServices: services.length,
      runningServices,
      crashedServices,
      monitoringIntervals: this.monitoringIntervals.size,
      uptime: (Date.now() - this.startTime) / 1000
    };
  }

  /**
   * Get global health status
   */
  async getGlobalHealth() {
    const services = this.getServicesStatus();
    const criticalServices = Object.values(services).filter(s => s.critical);
    const criticalServicesRunning = criticalServices.filter(s => s.status === 'running').length;
    const totalServicesRunning = Object.values(services).filter(s => s.status === 'running').length;

    let overallStatus = 'healthy';
    if (criticalServicesRunning < criticalServices.length) {
      overallStatus = 'degraded';
    }
    if (criticalServicesRunning === 0) {
      overallStatus = 'critical';
    }

    return {
      overallHealth: {
        status: overallStatus,
        criticalServicesRunning,
        totalCriticalServices: criticalServices.length,
        totalServicesRunning,
        totalServices: Object.keys(services).length
      },
      services,
      systemStats: this.getSystemStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start a service
   */
  async startService(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (service.status === 'running') {
      throw new Error(`Service ${serviceId} is already running`);
    }

    try {
      if (service.command) {
        const childProcess = spawn(service.command, service.args, {
          cwd: process.cwd(),
          stdio: 'pipe',
          detached: false
        });

        service.pid = childProcess.pid;
        service.status = 'starting';
        service.startTime = Date.now();

        // Wait a moment for the process to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if process is still running
        try {
          process.kill(childProcess.pid, 0); // Test if process exists
          service.status = 'running';
        } catch (error) {
          service.status = 'crashed';
          throw new Error(`Service ${serviceId} failed to start`);
        }

        this.emit('serviceStarted', {
          serviceId,
          service: service.name,
          pid: childProcess.pid,
          timestamp: new Date().toISOString()
        });

        return true;
      } else {
        throw new Error(`Service ${serviceId} cannot be started manually`);
      }
    } catch (error) {
      service.status = 'crashed';
      service.lastError = error.message;
      this.emit('serviceError', {
        serviceId,
        service: service.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Stop a service
   */
  async stopService(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (service.status !== 'running') {
      throw new Error(`Service ${serviceId} is not running`);
    }

    try {
      if (service.pid) {
        process.kill(service.pid, 'SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force kill if still running
        try {
          process.kill(service.pid, 0);
          process.kill(service.pid, 'SIGKILL');
        } catch (error) {
          // Process already terminated
        }
      }

      service.status = 'stopped';
      service.pid = null;
      service.uptime = 0;
      service.metrics = { cpu: 0, memory: 0, uptime: 0 };

      this.emit('serviceStopped', {
        serviceId,
        service: service.name,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      service.lastError = error.message;
      this.emit('serviceError', {
        serviceId,
        service: service.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Restart a service
   */
  async restartService(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    try {
      if (service.status === 'running') {
        await this.stopService(serviceId);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await this.startService(serviceId);
      service.restartCount++;

      this.emit('serviceRestarted', {
        serviceId,
        service: service.name,
        restartCount: service.restartCount,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      service.lastError = error.message;
      this.emit('serviceError', {
        serviceId,
        service: service.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.processDiscoveryInterval) {
      clearInterval(this.processDiscoveryInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
  }

  /**
   * Get processes using direct PS command for more reliable detection
   */
  async getProcessesViaPS() {
    try {
      const { stdout } = await execAsync('ps aux');
      const lines = stdout.split('\n').slice(1); // Skip header
      const processes = [];

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            const pid = parseInt(parts[1]);
            const command = parts.slice(10).join(' ');
            const name = parts[10];
            
            if (pid && command) {
              processes.push({
                pid,
                command,
                name: name.split('/').pop() // Get just the executable name
              });
            }
          }
        }
      }
      
      return processes;
    } catch (error) {
      console.error('Error getting processes via PS:', error);
      return [];
    }
  }

  /**
   * Check if a manually detected process matches a service
   */
  isServiceProcessManual(process, service) {
    const cmd = process.command.toLowerCase();
    const name = process.name.toLowerCase();
    
    // Skip services without processNames
    if (!service.processNames || !Array.isArray(service.processNames)) {
      return false;
    }

    // Special handling for specific service types
    if (service.type === 'nodejs') {
      return cmd.includes('node') && cmd.includes('backend/server.js');
    }
    
    if (service.type === 'webpack') {
      return (cmd.includes('webpack') && cmd.includes('serve')) || 
             (cmd.includes('npm') && cmd.includes('react:dev'));
    }
    
    if (service.type === 'electron') {
      return cmd.includes('electron') && !cmd.includes('typescript');
    }
    
    if (service.type === 'ssh') {
      return cmd.includes('sshd') || (cmd.includes('ssh') && cmd.includes('-D'));
    }

    // Generic check for process names
    for (const processName of service.processNames) {
      if (cmd.includes(processName.toLowerCase()) || 
          name.includes(processName.toLowerCase())) {
        return true;
      }
    }

    return false;
  }
}

module.exports = EnhancedServicesManager;
