const fs = require('fs');
const path = require('path');
const ssh2 = require('ssh2');
const crypto = require('crypto');

class SSHServer {
  constructor() {
    this.server = null;
    this.connections = new Map();
    this.keyPair = null;
    this.authorizedKeys = [];
  }

  /**
   * Initialize the SSH server
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.loadOrGenerateKeys();
      this.loadAuthorizedKeys();
    } catch (error) {
      console.error('Error initializing SSH server:', error);
      throw error;
    }
  }

  /**
   * Load existing keys or generate new ones
   * @returns {Promise<void>}
   */
  async loadOrGenerateKeys() {
    const keyDir = path.join(__dirname, '..', 'keys');
    const hostKeyPath = path.join(keyDir, 'host_rsa');
    
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }
    
    if (fs.existsSync(hostKeyPath)) {
      try {
        // Load existing keys
        const privateKeyData = fs.readFileSync(hostKeyPath, 'utf8');
        this.keyPair = {
          privateKey: privateKeyData
        };
        console.log('Loaded existing SSH host keys');
      } catch (error) {
        console.error('Error loading existing keys, generating new ones:', error);
        await this.generateAndSaveNewKeys(hostKeyPath);
      }
    } else {
      // Generate new keys
      await this.generateAndSaveNewKeys(hostKeyPath);
    }
  }
  
  /**
   * Generate and save new SSH keys in the proper format
   * @param {string} hostKeyPath - Path to save the private key
   * @returns {Promise<void>}
   */
  async generateAndSaveNewKeys(hostKeyPath) {
    console.log('Generating new SSH host keys...');
    
    // Generate RSA key pair
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      }
    });
    
    fs.writeFileSync(hostKeyPath, privateKey, 'utf8');
    this.keyPair = { privateKey };
    console.log('SSH host keys generated and saved');
  }

  /**
   * Generate an SSH key pair
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async generateKeyPair() {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({ publicKey, privateKey });
      });
    });
  }

  /**
   * Load authorized keys for client authentication
   */
  loadAuthorizedKeys() {
    const keyDir = path.join(__dirname, '..', 'keys');
    const authorizedKeysPath = path.join(keyDir, 'authorized_keys');
    
    if (fs.existsSync(authorizedKeysPath)) {
      const content = fs.readFileSync(authorizedKeysPath, 'utf8');
      this.authorizedKeys = content.split('\n').filter(line => line.trim());
      console.log(`Loaded ${this.authorizedKeys.length} authorized keys`);
    } else {
      console.log('No authorized keys found');
    }
  }

  /**
   * Add a new authorized key for client authentication
   * @param {string} publicKey - Public key to authorize
   */
  addAuthorizedKey(publicKey) {
    const keyDir = path.join(__dirname, '..', 'keys');
    const authorizedKeysPath = path.join(keyDir, 'authorized_keys');
    
    if (!this.authorizedKeys.includes(publicKey)) {
      this.authorizedKeys.push(publicKey);
      fs.writeFileSync(authorizedKeysPath, this.authorizedKeys.join('\n'), 'utf8');
      console.log('Added new authorized key');
    }
  }

  /**
   * Start the SSH server
   * @param {number} port - Port to listen on
   * @returns {Promise<void>}
   */
  start(port = 2222) {
    return new Promise((resolve, reject) => {
      this.server = new ssh2.Server({
        hostKeys: [this.keyPair.privateKey]
      }, (client) => {
        console.log('Client connected to SSH server');
        
        client.on('authentication', (ctx) => {
          if (ctx.method === 'publickey') {
            // TODO: Implement proper public key verification
            // For now, accept all connections in development
            return ctx.accept();
          }
          
          ctx.reject();
        });
        
        client.on('ready', () => {
          console.log('Client authenticated');
          
          client.on('session', (accept, reject) => {
            const session = accept();
            
            // Handle exec requests (commands)
            session.on('exec', (accept, reject, info) => {
              const stream = accept();
              const command = info.command;
              
              console.log(`Executing command: ${command}`);
              
              // Process the command and return result
              this.executeCommand(command)
                .then(result => {
                  stream.write(result);
                  stream.exit(0);
                  stream.end();
                })
                .catch(error => {
                  stream.stderr.write(error.message);
                  stream.exit(1);
                  stream.end();
                });
            });
          });
        });
        
        client.on('error', (err) => {
          console.error('SSH client error:', err);
        });
        
        client.on('end', () => {
          console.log('Client disconnected from SSH server');
        });
      });
      
      this.server.listen(port, () => {
        console.log(`SSH server listening on port ${port}`);
        resolve();
      });
      
      this.server.on('error', (err) => {
        console.error('SSH server error:', err);
        reject(err);
      });
    });
  }

  /**
   * Execute a command received via SSH
   * @param {string} command - Command to execute
   * @returns {Promise<string>}
   */
  async executeCommand(command) {
    // Parse the command and execute appropriate function
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
      case 'get-system-info':
        return JSON.stringify(await this.getSystemInfo());
      case 'get-metrics':
        return JSON.stringify(await this.getMetrics());
      case 'get-processes':
        return JSON.stringify(await this.getProcesses());
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }

  /**
   * Get system information (placeholder for actual implementation)
   * @returns {Promise<object>}
   */
  async getSystemInfo() {
    // This would connect to your actual system monitoring logic
    return {
      version: '1.0.0',
      hostname: require('os').hostname(),
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  /**
   * Get system metrics (placeholder for actual implementation)
   * @returns {Promise<object>}
   */
  async getMetrics() {
    // This would connect to your actual metrics collection logic
    return {
      cpu: Math.random() * 100,
      memory: {
        total: 16384,
        used: Math.random() * 16384
      }
    };
  }

  /**
   * Get process list (placeholder for actual implementation)
   * @returns {Promise<Array>}
   */
  async getProcesses() {
    // This would connect to your actual process monitoring logic
    return [
      { pid: 1, name: 'main', cpu: Math.random() * 100, memory: Math.random() * 1024 },
      { pid: 2, name: 'renderer', cpu: Math.random() * 100, memory: Math.random() * 1024 },
      { pid: 3, name: 'backend', cpu: Math.random() * 100, memory: Math.random() * 1024 }
    ];
  }

  /**
   * Stop the SSH server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('SSH server stopped');
    }
  }
}

module.exports = SSHServer;
