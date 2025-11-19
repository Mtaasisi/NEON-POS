/**
 * Server Starter Service
 * A simple HTTP service that can start the backend server automatically
 * Runs on port 3002 and provides endpoints to manage the backend server
 */

import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Track server process
let serverProcess = null;
let isStarting = false;

/**
 * Check if backend server is running
 */
const checkServerHealth = async () => {
  try {
    const response = await fetch('http://localhost:8000/health', {
      timeout: 3000,
      headers: {
        'User-Agent': 'Server-Starter/1.0'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Start the backend server
 */
const startServer = async () => {
  if (isStarting) {
    return { success: false, message: 'Server is already starting' };
  }

  if (serverProcess) {
    return { success: false, message: 'Server is already running' };
  }

  isStarting = true;

  try {
    console.log('🚀 Starting backend server...');

    // Change to server directory and start
    const serverDir = path.join(__dirname, '..', 'server');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    serverProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // Handle process events
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      isStarting = false;
      serverProcess = null;
    });

    serverProcess.on('exit', (code) => {
      console.log(`🔴 Server process exited with code ${code}`);
      isStarting = false;
      serverProcess = null;
    });

    serverProcess.stdout.on('data', (data) => {
      console.log('📝 Server stdout:', data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('⚠️ Server stderr:', data.toString().trim());
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if server is responding
    const isHealthy = await checkServerHealth();

    if (isHealthy) {
      isStarting = false;
      return { success: true, message: 'Server started successfully' };
    } else {
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 5000));
      const isHealthy2 = await checkServerHealth();

      isStarting = false;
      if (isHealthy2) {
        return { success: true, message: 'Server started successfully (after delay)' };
      } else {
        return { success: false, message: 'Server process started but health check failed' };
      }
    }

  } catch (error) {
    console.error('❌ Error starting server:', error);
    isStarting = false;
    return { success: false, message: `Failed to start server: ${error.message}` };
  }
};

/**
 * Stop the backend server
 */
const stopServer = async () => {
  if (!serverProcess) {
    return { success: true, message: 'Server is not running' };
  }

  try {
    console.log('🛑 Stopping backend server...');

    if (process.platform === 'win32') {
      execAsync(`taskkill /pid ${serverProcess.pid} /t /f`);
    } else {
      process.kill(-serverProcess.pid, 'SIGTERM');
    }

    serverProcess = null;
    return { success: true, message: 'Server stopped successfully' };
  } catch (error) {
    console.error('❌ Error stopping server:', error);
    return { success: false, message: `Failed to stop server: ${error.message}` };
  }
};

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    serverRunning: !!serverProcess,
    isStarting
  });
});

app.post('/start-server', async (req, res) => {
  console.log('📥 Received start-server request');

  const result = await startServer();

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.post('/stop-server', async (req, res) => {
  console.log('📥 Received stop-server request');

  const result = await stopServer();

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/server-status', async (req, res) => {
  const isRunning = await checkServerHealth();

  res.json({
    isRunning,
    processRunning: !!serverProcess,
    isStarting,
    timestamp: new Date().toISOString()
  });
});

// Start the server starter service
app.listen(PORT, () => {
  console.log('🚀 Server Starter Service running on http://localhost:' + PORT);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health - Service health check');
  console.log('  POST /start-server - Start the backend server');
  console.log('  POST /stop-server - Stop the backend server');
  console.log('  GET  /server-status - Check backend server status');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Server Starter Service...');
  if (serverProcess) {
    await stopServer();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Server Starter Service...');
  if (serverProcess) {
    await stopServer();
  }
  process.exit(0);
});
