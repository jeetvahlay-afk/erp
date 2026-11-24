const { spawn, exec } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function checkPort(port, host = '127.0.0.1', timeout = 400) {
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

function killTree(pid) {
  if (!pid) return;
  try {
    if (isWin) {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    // Process already gone
  }
}

const processes = [];

function startService({ name, dir, color, port }) {
  const fullDir = path.resolve(rootDir, dir);
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: fullDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWin,
    detached: !isWin,
  });

  processes.push({ name, child, dir });

  const formatLog = (data, isError = false) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const prefix = `${color}[${name}]\x1b[0m`;
      if (isError) {
        process.stderr.write(`${prefix} ${line}\n`);
      } else {
        process.stdout.write(`${prefix} ${line}\n`);
      }
    }
  };

  child.stdout.on('data', (d) => formatLog(d, false));
  child.stderr.on('data', (d) => formatLog(d, true));

  child.on('error', (err) => {
    console.error(`\x1b[31m[${name}] Failed to start:\x1b[0m`, err.message);
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\x1b[33m[${name}] Process exited with code ${code}\x1b[0m`);
    }
  });

  return child;
}

async function main() {
  console.log('\x1b[36m' + '='.repeat(62));
  console.log('   TeamHub ERP & Assessment Portal - Unified Environment');
  console.log('='.repeat(62) + '\x1b[0m');

  const [port5000, port5173, port5174] = await Promise.all([
    checkPort(5000),
    checkPort(5173),
    checkPort(5174),
  ]);

  console.log('Checking service ports...');
  if (port5000) console.log('  \x1b[33m- Port 5000 (Backend API) is already active.\x1b[0m');
  if (port5173) console.log('  \x1b[33m- Port 5173 (ERP Client) is already active.\x1b[0m');
  if (port5174) console.log('  \x1b[33m- Port 5174 (Assessment Portal) is already active.\x1b[0m');

  if (!port5000) {
    console.log('  \x1b[32m✔ Starting Backend API (server)...\x1b[0m');
    startService({ name: 'Backend', dir: 'server', color: '\x1b[35m', port: 5000 });
  }

  if (!port5173) {
    console.log('  \x1b[32m✔ Starting ERP Web Client (client)...\x1b[0m');
    startService({ name: 'ERP-Client', dir: 'client', color: '\x1b[32m', port: 5173 });
  }

  if (!port5174) {
    console.log('  \x1b[32m✔ Starting Assessment Portal (assessment-client)...\x1b[0m');
    startService({ name: 'Assessment', dir: 'assessment-client', color: '\x1b[36m', port: 5174 });
  }

  console.log('\n\x1b[32mReady! Services accessible at:\x1b[0m');
  console.log('  • \x1b[1mERP Client:\x1b[0m         \x1b[34mhttp://localhost:5173\x1b[0m');
  console.log('  • \x1b[1mAssessment Portal:\x1b[0m  \x1b[34mhttp://localhost:5174\x1b[0m');
  console.log('  • \x1b[1mBackend API:\x1b[0m        \x1b[34mhttp://localhost:5000\x1b[0m');
  console.log('\nPress \x1b[1mCtrl+C\x1b[0m to stop all services cleanly.\n');

  const shutdown = () => {
    console.log('\n\x1b[33mStopping all services cleanly...\x1b[0m');
    for (const { name, child } of processes) {
      if (child && child.pid) {
        killTree(child.pid);
      }
    }
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
