const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const processes = new Set();
let stopping = false;

function stop(exitCode) {
  if (stopping) return;

  stopping = true;
  process.exitCode = exitCode;
  for (const child of processes) {
    child.kill();
  }
}

const services = [
  {
    name: 'server',
    cwd: resolve(root, 'server'),
    script: resolve(root, 'server', 'node_modules', 'nodemon', 'bin', 'nodemon.js'),
    args: ['--ignore', 'data/users.json', 'src/server.js'],
  },
  {
    name: 'client',
    cwd: resolve(root, 'client'),
    script: resolve(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js'),
    args: [],
  },
];

for (const service of services) {
  const child = spawn(process.execPath, [service.script, ...service.args], {
    cwd: service.cwd,
    stdio: 'inherit',
  });
  processes.add(child);

  child.on('error', (error) => {
    console.error(`Failed to start ${service.name}:`, error);
    stop(1);
  });

  child.on('close', (code) => {
    processes.delete(child);
    if (!stopping) {
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
