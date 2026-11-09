import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const frontendRoot = resolve(projectRoot, 'frontend');
const isWindows = process.platform === 'win32';
const apiCli = resolve(projectRoot, 'node_modules/@nestjs/cli/bin/nest.js');
const frontendCli = resolve(frontendRoot, 'node_modules/next/dist/bin/next');
const children = [];
let isStopping = false;
let finalExitCode = 0;

function runNodeScript(name, cliPath, args, cwd) {
  const child = spawn(process.execPath, [cliPath, ...args], { cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.once('error', (error) => {
    console.error(`[${name}] No se pudo iniciar: ${error.message}`);
    stopAll(1);
  });
  child.once('exit', (code, signal) => {
    if (!isStopping) {
      if (signal) console.log(`[${name}] terminó por señal ${signal}.`);
      else if (code !== 0) console.error(`[${name}] terminó con código ${code}.`);
      stopAll(code ?? 1);
    }
  });
  return child;
}

function stopAll(exitCode) {
  if (isStopping) return;
  isStopping = true;
  finalExitCode = exitCode;

  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (isWindows) {
      // Stop the npm command shell and any Node watcher it started.
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGTERM');
    }
  }

  const exitTimer = setTimeout(() => process.exit(finalExitCode), 1500);
  exitTimer.unref();
}

function isPortInUse(port) {
  return new Promise((resolvePort) => {
    const probe = createServer();
    probe.once('error', (error) => resolvePort(error.code === 'EADDRINUSE'));
    probe.listen(port, '::', () => probe.close(() => resolvePort(false)));
  });
}

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));

console.log('Iniciando DoomerPlace. Presiona Ctrl+C para detener los procesos iniciados aquí.');
if (await isPortInUse(3000)) {
  console.log('[API] Ya hay un servicio escuchando en el puerto 3000; se reutilizará.');
} else {
  runNodeScript('API', apiCli, ['start', '--watch'], projectRoot);
}

if (await isPortInUse(3001)) {
  console.log('[frontend] Ya hay un servicio escuchando en el puerto 3001; se reutilizará.');
} else {
  runNodeScript('frontend', frontendCli, ['dev', '--port', '3001'], frontendRoot);
}

if (children.length > 0) console.log('API: http://localhost:3000  |  Web: http://localhost:3001');
