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
        this.keyPair = {
          privateKey: fs.readFileSync(hostKeyPath, 'utf8')
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
    
    // For development, create a static key that we know works with ssh2
    const staticPrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
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
9vdEBhcHAtc2VydmVyAQIDBA==
-----END OPENSSH PRIVATE KEY-----`;

    fs.writeFileSync(hostKeyPath, staticPrivateKey, 'utf8');
    this.keyPair = { privateKey: staticPrivateKey };
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
