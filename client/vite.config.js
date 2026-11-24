import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortActive(port, host = '127.0.0.1', timeout = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function autoStartAssessmentPlugin() {
  let assessmentProcess = null;

  const killAssessment = () => {
    if (!assessmentProcess || assessmentProcess.killed) return;
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${assessmentProcess.pid} /T /F`, () => {});
      } else {
        process.kill(-assessmentProcess.pid, 'SIGTERM');
      }
    } catch {
      // process already exited
    }
    assessmentProcess = null;
  };

  return {
    name: 'auto-start-assessment-portal',
    apply: 'serve',
    async configureServer(server) {
      const assessmentDir = path.resolve(__dirname, '../assessment-client');
      const inUse = await isPortActive(5174);
      if (inUse) {
        server.config.logger.info('\x1b[36m[Assessment Portal]\x1b[0m Port 5174 active — portal already running.');
        return;
      }

      server.config.logger.info('\x1b[36m[Assessment Portal]\x1b[0m Automatically launching assessment portal at http://localhost:5174 ...');
      const isWin = process.platform === 'win32';
      assessmentProcess = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
        cwd: assessmentDir,
        stdio: 'inherit',
        shell: isWin,
        detached: !isWin,
      });

      assessmentProcess.on('error', (err) => {
        server.config.logger.error(`\x1b[31m[Assessment Portal]\x1b[0m Failed to auto-start: ${err.message}`);
      });

      const cleanup = () => {
        killAssessment();
      };

      process.once('exit', cleanup);
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
      server.httpServer?.once('close', cleanup);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react(), autoStartAssessmentPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: mode === 'development' ? {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:5000',
        changeOrigin: true,
      },
    } : undefined,
  },
  preview: { host: true, port: 4173, strictPort: true },
  build: {
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          if (id.includes('/axios/')) return 'http';
          if (id.includes('/lucide-react/')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
}));
