const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SSHConnection {
  constructor() {
    this.connected = false;
    this.ssh = new NodeSSH();
    this.keyPair = null;
  }

  /**
   * Generate an SSH key pair for secure communication
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
        
        this.keyPair = { publicKey, privateKey };
        
        // Save keys to disk for persistence
        const keyDir = path.join(__dirname, '..', '..', 'keys');
        if (!fs.existsSync(keyDir)) {
          fs.mkdirSync(keyDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(keyDir, 'id_rsa'), privateKey, 'utf8');
        fs.writeFileSync(path.join(keyDir, 'id_rsa.pub'), publicKey, 'utf8');
        
        resolve(this.keyPair);
      });
    });
  }

  /**
   * Load existing key pair from disk
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async loadKeyPair() {
    try {
      const keyDir = path.join(__dirname, '..', '..', 'keys');
      const privateKey = fs.readFileSync(path.join(keyDir, 'id_rsa'), 'utf8');
      const publicKey = fs.readFileSync(path.join(keyDir, 'id_rsa.pub'), 'utf8');
      this.keyPair = { publicKey, privateKey };
      return this.keyPair;
    } catch (error) {
      console.log('No existing key pair found, generating new one...');
      return await this.generateKeyPair();
    }
  }

  /**
   * Connect to SSH server
   * @param {Object} config - SSH connection config
   * @returns {Promise<void>}
   */
  async connect(config) {
    try {
      if (!this.keyPair) {
        await this.loadKeyPair();
      }
      
      // Connect using key authentication
      await this.ssh.connect({
        host: config.host || 'localhost',
        port: config.port || 22,
        username: config.username || 'electron',
        privateKey: this.keyPair.privateKey,
        ...config
      });
      
      this.connected = true;
      console.log('SSH connection established');
    } catch (error) {
      console.error('SSH connection error:', error);
      throw error;
    }
  }

  /**
   * Execute a command over SSH
   * @param {string} command - Command to execute
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async exec(command) {
    if (!this.connected) {
      throw new Error('SSH not connected');
    }

    try {
      const result = await this.ssh.execCommand(command);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      };
    } catch (error) {
      console.error('SSH exec error:', error);
      throw error;
    }
  }

  /**
   * Transfer a file over SSH
   * @param {string} localPath - Path to local file
   * @param {string} remotePath - Path to remote destination
   * @returns {Promise<void>}
   */
  async putFile(localPath, remotePath) {
    if (!this.connected) {
      throw new Error('SSH not connected');
    }

    try {
      await this.ssh.putFile(localPath, remotePath);
      console.log(`File transferred: ${localPath} -> ${remotePath}`);
    } catch (error) {
      console.error('SSH file transfer error:', error);
      throw error;
    }
  }

  /**
   * Close the SSH connection
   */
  disconnect() {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
      console.log('SSH connection closed');
    }
  }
}

// Export a singleton instance
const sshConnection = new SSHConnection();
module.exports = sshConnection;
