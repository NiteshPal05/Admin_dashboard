import { spawn } from 'child_process';

function start(label, args) {
  const child = spawn('npm', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  return child;
}

const backend = start('backend', ['run', 'dev', '--workspace', 'backend']);
const frontend = start('frontend', ['run', 'dev', '--workspace', 'frontend']);

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(code);
}

backend.on('exit', (code, signal) => {
  if (signal || code !== 0) {
    shutdown(code || 1);
  }
});

frontend.on('exit', (code, signal) => {
  if (signal || code !== 0) {
    shutdown(code || 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
