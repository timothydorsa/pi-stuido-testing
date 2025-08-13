# 🖥️ Pi Studio System Monitor

A comprehensive real-time system monitoring application built with React, Electron, and Node.js. Features advanced process management with interactive gauges, real-time charts, and process control capabilities.

## ✨ Features

### 🎯 Core Functionality
- **Real-time System Monitoring**: Live CPU, memory, disk, and network metrics
- **Process Management**: Visual gauges with process control (stop, resume, kill)
- **Interactive Charts**: Real-time data visualization with Recharts
- **WebSocket Integration**: Live data updates every 3 seconds
- **System Monitoring**: Real-time CPU, memory, and process monitoring
- **Service Health**: Monitor running services and their resource usage
- **Heap Monitoring**: Track application memory usage and heap statistics
- **Real-time Preview**: Separate preview window with live system updates
- **API Client**: Postman-like interface for testing and documenting APIs with Swagger UI

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main Process  │    │ Renderer Process│    │ Backend Process │
│   (Electron)    │◄──►│    (React)      │    │   (Express)     │
│                 │IPC │                 │    │                 │
│ • Window Mgmt   │    │ • Dashboard UI  │    │ • REST API      │
│ • System Monitor│    │ • Components    │    │ • WebSocket     │
│ • IPC Handler   │    │ • Real-time UI  │    │ • System Info   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Preview Window  │
                    │   (Separate)    │
                    │                 │
                    │ • Live Updates  │
                    │ • WebSocket     │
                    │ • Real-time UI  │
                    └─────────────────┘
```

## Technology Stack

- **Frontend**: React, CSS3, HTML5
- **Desktop Framework**: Electron
- **Backend**: Node.js, Express
- **Build Tools**: Webpack, Babel
- **System Monitoring**: systeminformation, pidusage
- **Real-time Communication**: WebSocket (ws)
- **Development**: Concurrently, wait-on

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pi-studio-testing
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development environment:
```bash
npm run dev
```

This will:
1. Start the React development server on http://localhost:3000
2. Start the Electron application
3. Launch the Express backend on http://localhost:3001

### Individual Commands

- **Start React dev server**: `npm run react:dev`
- **Start Electron in dev mode**: `npm run electron:dev`
- **Start backend server**: `npm run backend`
- **Build for production**: `npm run build`

## Application Components

### Main Process (`main.js`)
- Manages Electron application lifecycle
- Creates and manages browser windows
- Handles IPC communication
- Monitors system resources
- Spawns and manages backend process

### Renderer Process (`src/App.js`)
- React-based user interface
- Real-time dashboard components
- API Client integration

### API Client (`src/components/ApiClient/ApiClient.js`)
- Postman-like interface for API testing
- Swagger UI integration
- Import/Export collections (including Postman format)
- Request history and organization
- Syntax highlighting for JSON responses
- Automatic cURL command generation
- Real-time dashboard components

## Troubleshooting

### "global is not defined" or "require is not defined" Errors

These errors occur due to Node.js modules being used in the browser environment. The application uses several approaches to fix this:

1. **Node Polyfill Plugin**: We use `node-polyfill-webpack-plugin` to automatically provide Node.js core modules in the browser.

2. **Manual Polyfills**: The `src/polyfill.js` file defines browser-compatible versions of Node.js globals.

3. **Webpack Configuration**: Our webpack config includes fallbacks for Node.js core modules.

If you encounter these errors:

1. Make sure all polyfill dependencies are installed:
   ```bash
   npm install --save-dev node-polyfill-webpack-plugin buffer process
   ```

2. Check that `webpack.config.js` properly includes the NodePolyfillPlugin.

3. Ensure the entry point in webpack includes the polyfill file before your main app code.

### Port Already in Use

If you see an error like `Error: listen EADDRINUSE: address already in use :::3000`:

1. Find the process using the port:
   ```bash
   lsof -i :3000,3001 | grep LISTEN
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>
   ```

3. Try starting the application again.
- System metrics visualization
- Service health monitoring

### Backend Process (`backend/server.js`)
- Express REST API server
- WebSocket server for real-time data
- System information endpoints
- Health check endpoints

### Components

1. **SystemMonitor**: Real-time CPU and memory usage
2. **ServiceHealth**: Monitor running services and their health
3. **HeapMonitor**: Application memory and heap statistics
4. **ProcessList**: Top system processes with resource usage

## API Endpoints

### Backend API (Port 3001)

- `GET /health` - Backend health check
- `GET /api/system` - System information
- `GET /api/metrics` - Real-time system metrics  
- `GET /api/processes` - Running processes list
- `GET /preview` - Preview window HTML page
- `WebSocket ws://localhost:3001` - Real-time data stream

### IPC Channels

- `get-system-info` - Get comprehensive system information
- `get-system-metrics` - Get current system metrics
- `get-service-health` - Get service health data
- `get-heap-info` - Get heap memory information
- `open-preview-window` - Open real-time preview window
- `send-to-preview` - Send data to preview window

## Building for Production

```bash
npm run build
```

This will:
1. Build the React application for production
2. Package the Electron application for your platform

## Features in Detail

### System Monitoring
- Real-time CPU usage tracking
- Memory usage (total, used, free)
- System information (OS, CPU cores)
- Background monitoring every 2 seconds

### Service Health
- Track running application services
- Monitor CPU and memory usage per service
- Service uptime tracking
- Error detection and reporting

### Heap Monitoring
- Application heap usage
- Total heap size
- External memory usage
- RSS (Resident Set Size)

### Real-time Preview
- Separate preview window
- WebSocket-based live updates
- Real-time system metrics display
- Independent of main dashboard

## Development Guidelines

- Use modern ES6+ features
- Follow React functional component patterns
- Implement proper error handling for IPC
- Use async/await for asynchronous operations
- Maintain clean separation between processes

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 3001 are available
2. **Permission errors**: May need elevated privileges for system monitoring
3. **Build errors**: Check Node.js version compatibility

### Debug Mode

Run Electron with dev tools:
```bash
NODE_ENV=development npm run electron:dev
```

## License

ISC License
