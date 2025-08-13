import { apiRequest } from './api';

// Real SSH client that connects to the backend SSH server
class SSHClient {
  constructor() {
    this.connected = false;
    this.websocket = null;
    this.messageHandlers = new Map();
  }

  /**
   * Initialize the SSH client
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('Initializing SSH client for backend connection');
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing SSH client:', error);
      throw error;
    }
  }

  /**
   * Connect to the SSH server via WebSocket proxy
   * @param {string} host - Server hostname or IP  
   * @param {number} port - Server port
   * @param {string} username - SSH username
   * @param {string} password - SSH password (if using password auth)
   * @returns {Promise<boolean>}
   */
  async connect(host = 'localhost', port = 2222, username = 'user', password = '') {
    try {
      // Connect via our backend API
      const result = await apiRequest('ssh-connect', {
        method: 'POST',
        body: JSON.stringify({ host, port, username, password })
      });

      this.connected = result.connected;
      console.log('SSH connection established:', result);
      return this.connected;
    } catch (error) {
      console.error('SSH connection failed:', error);
      return false;
    }
  }

  /**
   * Execute a command via SSH
   * @param {string} command - Command to execute
   * @returns {Promise<string>}
   */
  async executeCommand(command) {
    try {
      if (!this.connected) {
        throw new Error('Not connected to SSH server');
      }

      const result = await apiRequest('ssh-execute', {
        method: 'POST',
        body: JSON.stringify({ command })
      });

      return result.output;
    } catch (error) {
      console.error('Error executing SSH command:', error);
      throw error;
    }
  }

  /**
   * Get system information via SSH
   * @returns {Promise<Object>}
   */
  async getSystemInfo() {
    try {
      return await apiRequest('system');
    } catch (error) {
      console.error('Error getting system info:', error);
      throw error;
    }
  }

  /**
   * Get system metrics via SSH
   * @returns {Promise<Object>}
   */
  async getMetrics() {
    try {
      return await apiRequest('metrics');
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }

  /**
   * Get process list via SSH
   * @returns {Promise<Object>}
   */
  async getProcesses() {
    try {
      return await apiRequest('processes');
    } catch (error) {
      console.error('Error getting processes:', error);
      throw error;
    }
  }

  /**
   * Disconnect from SSH server
   */
  disconnect() {
    this.connected = false;
    console.log('SSH client disconnected');
  }
}

// Create a singleton instance
const sshClient = new SSHClient();

export default sshClient;