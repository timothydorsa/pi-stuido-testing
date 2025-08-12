// Browser-friendly SSH client mock
// This is a mock implementation for development and testing

class SSHClient {
  constructor() {
    this.connected = false;
    this.keyPair = null;
    this.hostPublicKey = null;
  }

  /**
   * Initialize the SSH client
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // In a browser environment, we need to mock some functionality
      console.log('Initializing SSH client in browser environment');
      this.keyPair = {
        publicKey: 'MOCK_PUBLIC_KEY',
        privateKey: 'MOCK_PRIVATE_KEY'
      };
      
      // Mock fetching server's public key
      this.hostPublicKey = 'MOCK_HOST_PUBLIC_KEY';
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing SSH client:', error);
      throw error;
    }
  }

  /**
   * Register this client's public key with the server
   * @returns {Promise<void>}
   */
  async registerPublicKey() {
    try {
      console.log('Mock registering public key with server');
      return Promise.resolve();
    } catch (error) {
      console.error('Error registering public key:', error);
      throw error;
    }
  }

  /**
   * Connect to the SSH server
   * @param {string} host - Server hostname or IP
   * @param {number} port - Server port
   * @returns {Promise<void>}
   */
  connect(host = 'localhost', port = 2222) {
    console.log(`Mock connecting to SSH server at ${host}:${port}`);
    this.connected = true;
    return Promise.resolve();
  }

  /**
   * Execute a command on the SSH server
   * @param {string} command - Command to execute
   * @returns {Promise<string>}
   */
  executeCommand(command) {
    console.log(`Mock executing command: ${command}`);
    
    // Return mock data based on command
    switch (command) {
      case 'get-system-info':
        return Promise.resolve(JSON.stringify({
          version: '1.0.0',
          hostname: 'mock-hostname',
          uptime: 3600,
          timestamp: Date.now()
        }));
      case 'get-metrics':
        return Promise.resolve(JSON.stringify({
          cpu: Math.random() * 100,
          memory: {
            total: 16384,
            used: Math.random() * 8192
          }
        }));
      case 'get-processes':
        return Promise.resolve(JSON.stringify([
          { pid: 1, name: 'process1', cpu: Math.random() * 10, memory: Math.random() * 500 },
          { pid: 2, name: 'process2', cpu: Math.random() * 10, memory: Math.random() * 500 }
        ]));
      default:
        return Promise.resolve('Unknown command');
    }
  }

  /**
   * Get system information via SSH
   * @returns {Promise<object>}
   */
  async getSystemInfo() {
    try {
      const result = await this.executeCommand('get-system-info');
      return JSON.parse(result);
    } catch (error) {
      console.error('Error getting system info via SSH:', error);
      throw error;
    }
  }

  /**
   * Get system metrics via SSH
   * @returns {Promise<object>}
   */
  async getMetrics() {
    try {
      const result = await this.executeCommand('get-metrics');
      return JSON.parse(result);
    } catch (error) {
      console.error('Error getting metrics via SSH:', error);
      throw error;
    }
  }

  /**
   * Get process list via SSH
   * @returns {Promise<Array>}
   */
  async getProcesses() {
    try {
      const result = await this.executeCommand('get-processes');
      return JSON.parse(result);
    } catch (error) {
      console.error('Error getting processes via SSH:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the SSH server
   */
  disconnect() {
    console.log('Mock disconnecting from SSH server');
    this.connected = false;
  }
}

// Create a singleton instance
const sshClient = new SSHClient();

export default sshClient;
