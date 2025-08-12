const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const si = require('systeminformation');
const { swaggerDocs } = require('./swagger');

class BackendServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.port = process.env.PORT || 3001;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupSwagger();
    this.start();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }
  
  setupSwagger() {
    swaggerDocs(this.app);
  }

  setupRoutes() {
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Check the health of the server
     *     description: Returns health status of the backend server
     *     tags:
     *       - Health
     *     responses:
     *       200:
     *         description: A successful response with health information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                 uptime:
     *                   type: number
     *                 memory:
     *                   type: object
     */
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    /**
     * @swagger
     * /api/system:
     *   get:
     *     summary: Get system information
     *     description: Returns detailed information about the system including CPU, memory, OS, and current load
     *     tags:
     *       - System Information
     *     responses:
     *       200:
     *         description: Successful response with system information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cpu:
     *                   type: object
     *                 memory:
     *                   type: object
     *                 os:
     *                   type: object
     *                 load:
     *                   type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     */
    this.app.get('/api/system', async (req, res) => {
      try {
        const [cpu, mem, osInfo, load] = await Promise.all([
          si.cpu(),
          si.mem(),
          si.osInfo(),
          si.currentLoad()
        ]);
        
        res.json({
          cpu,
          memory: mem,
          os: osInfo,
          load,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/metrics:
     *   get:
     *     summary: Get real-time system metrics
     *     description: Returns real-time metrics about CPU load, memory, network, and disk I/O
     *     tags:
     *       - System Metrics
     *     responses:
     *       200:
     *         description: Successful response with real-time metrics
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cpu:
     *                   type: object
     *                 memory:
     *                   type: object
     *                 network:
     *                   type: array
     *                   items:
     *                     type: object
     *                 disk:
     *                   type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     */
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const [cpuLoad, memInfo, networkStats, diskIO] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.networkStats(),
          si.disksIO()
        ]);
        
        res.json({
          cpu: cpuLoad,
          memory: memInfo,
          network: networkStats,
          disk: diskIO,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/processes:
     *   get:
     *     summary: Get running processes
     *     description: Returns a list of top 20 running processes on the system
     *     tags:
     *       - System Processes
     *     responses:
     *       200:
     *         description: Successful response with process list
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 processes:
     *                   type: array
     *                   items:
     *                     type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     */
    this.app.get('/api/processes', async (req, res) => {
      try {
        const processes = await si.processes();
        res.json({
          processes: processes.list.slice(0, 20), // Top 20 processes
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Preview endpoint for real-time preview window
    this.app.get('/preview', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Real-time Preview</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #1e1e1e;
              color: #ffffff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .metric-card {
              background: #2d2d2d;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
              border-left: 4px solid #0078d4;
            }
            .metric-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #0078d4;
            }
            .metric-value {
              font-size: 1.2em;
              color: #00ff00;
            }
            .status-indicator {
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #00ff00;
              margin-right: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1><span class="status-indicator"></span>Real-time System Preview</h1>
            <div id="preview-content">
              <div class="metric-card">
                <div class="metric-title">Waiting for data...</div>
              </div>
            </div>
          </div>
          
          <script>
            const ws = new WebSocket('ws://localhost:${this.port}');
            
            ws.onmessage = function(event) {
              const data = JSON.parse(event.data);
              updatePreview(data);
            };
            
            function updatePreview(data) {
              const content = document.getElementById('preview-content');
              if (data.type === 'metrics') {
                content.innerHTML = \`
                  <div class="metric-card">
                    <div class="metric-title">CPU Usage</div>
                    <div class="metric-value">\${data.cpu.toFixed(2)}%</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Memory Usage</div>
                    <div class="metric-value">\${(data.memory / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Active Services</div>
                    <div class="metric-value">\${data.services || 0}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Last Updated</div>
                    <div class="metric-value">\${new Date(data.timestamp).toLocaleTimeString()}</div>
                  </div>
                \`;
              }
            }
          </script>
        </body>
        </html>
      `);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      // Send real-time data every 3 seconds
      const interval = setInterval(async () => {
        try {
          const [cpuLoad, memInfo] = await Promise.all([
            si.currentLoad(),
            si.mem()
          ]);
          
          const data = {
            type: 'metrics',
            cpu: cpuLoad.currentLoad,
            memory: memInfo.used,
            services: 2, // Backend + Main process
            timestamp: Date.now()
          };
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          console.error('Error sending WebSocket data:', error);
        }
      }, 3000);
      
      ws.on('close', () => {
        clearInterval(interval);
        console.log('WebSocket client disconnected');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clearInterval(interval);
      });
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Backend server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`Preview: http://localhost:${this.port}/preview`);
    });
  }
}

new BackendServer();
