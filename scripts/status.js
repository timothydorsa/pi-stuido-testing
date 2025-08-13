#!/usr/bin/env node

const http = require('http');
const WebSocket = require('ws');

console.log('🔍 Pi Studio System Monitor - Status Check\n');

// Check Backend Health
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log('✅ Backend Server: HEALTHY');
          console.log(`   - Uptime: ${(health.uptime / 60).toFixed(1)} minutes`);
          console.log(`   - Memory: ${(health.memory.rss / 1024 / 1024).toFixed(1)} MB`);
          resolve(true);
        } catch (e) {
          console.log('❌ Backend Server: ERROR parsing response');
          resolve(false);
        }
      });
    }).on('error', () => {
      console.log('❌ Backend Server: NOT RESPONDING');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('❌ Backend Server: TIMEOUT');
      resolve(false);
    });
  });
}

// Check Frontend
function checkFrontend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3002', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Frontend Server: RUNNING');
        console.log('   - Port: 3002');
        console.log('   - Status: ' + res.statusCode);
        resolve(true);
      } else {
        console.log('⚠️  Frontend Server: UNEXPECTED STATUS ' + res.statusCode);
        resolve(false);
      }
    }).on('error', () => {
      console.log('❌ Frontend Server: NOT RESPONDING');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('❌ Frontend Server: TIMEOUT');
      resolve(false);
    });
  });
}

// Check WebSocket
function checkWebSocket() {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket('ws://localhost:8001');
      let messageReceived = false;
      
      ws.on('open', () => {
        console.log('✅ WebSocket: CONNECTED');
      });
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'metrics' && !messageReceived) {
            messageReceived = true;
            console.log('✅ WebSocket Metrics: FLOWING');
            console.log(`   - Processes: ${msg.processes?.top?.length || 0}`);
            console.log(`   - CPU Load: ${(msg.cpu?.currentLoad || 0).toFixed(1)}%`);
            ws.close();
            resolve(true);
          }
        } catch (e) {
          console.log('⚠️  WebSocket: INVALID MESSAGE FORMAT');
        }
      });
      
      ws.on('error', () => {
        console.log('❌ WebSocket: CONNECTION ERROR');
        resolve(false);
      });
      
      setTimeout(() => {
        if (!messageReceived) {
          console.log('⚠️  WebSocket: NO METRICS RECEIVED');
          ws.close();
          resolve(false);
        }
      }, 6000);
      
    } catch (e) {
      console.log('❌ WebSocket: FAILED TO CONNECT');
      resolve(false);
    }
  });
}

// Check API Endpoints
async function checkAPIEndpoints() {
  const endpoints = [
    '/api/processes',
    '/api/metrics',
    '/api/network-info'
  ];
  
  console.log('🔗 API Endpoints:');
  
  for (const endpoint of endpoints) {
    try {
      const result = await new Promise((resolve) => {
        const req = http.get(`http://localhost:8001${endpoint}`, (res) => {
          if (res.statusCode === 200) {
            console.log(`   ✅ ${endpoint}: OK`);
            resolve(true);
          } else {
            console.log(`   ❌ ${endpoint}: ${res.statusCode}`);
            resolve(false);
          }
        }).on('error', () => {
          console.log(`   ❌ ${endpoint}: ERROR`);
          resolve(false);
        });
        
        req.setTimeout(3000, () => {
          req.destroy();
          console.log(`   ❌ ${endpoint}: TIMEOUT`);
          resolve(false);
        });
      });
    } catch (e) {
      console.log(`   ❌ ${endpoint}: EXCEPTION`);
    }
  }
}

// Main execution
async function runStatusCheck() {
  const startTime = Date.now();
  
  await checkBackend();
  await checkFrontend();
  await checkWebSocket();
  await checkAPIEndpoints();
  
  const duration = Date.now() - startTime;
  console.log(`\n📊 Status check completed in ${duration}ms`);
  console.log('🌐 Access URLs:');
  console.log('   - Main App: http://localhost:3002');
  console.log('   - Metrics: http://localhost:3002/#/metrics');
  console.log('   - Process Management: http://localhost:3002/#/process-management');
  console.log('   - API Docs: http://localhost:8001/api-docs');
  
  process.exit(0);
}

runStatusCheck().catch(console.error);
