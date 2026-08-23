import { createServer } from 'http';
import { readFile, rm, mkdir, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, '.dev');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '0.0.0.0';
const mode = process.argv[2] || 'dev';
const apiUrl = process.env.VITE_API_URL || 'http://127.0.0.1:5001/api';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
};

let rebuildTimer = null;

function contentType(filePath) {
  return mimeTypes[path.extname(filePath)] || 'application/octet-stream';
}

async function build() {
  await mkdir(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'main.jsx')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    target: ['es2020'],
    outdir: outDir,
    entryNames: 'bundle',
    assetNames: 'assets/[name]-[hash]',
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.svg': 'file'
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
    logLevel: 'silent'
  });

  await copyPublicAssets();
  await writeIndexHtml();
}

async function copyPublicAssets() {
  try {
    await fs.promises.copyFile(path.join(publicDir, 'favicon.svg'), path.join(outDir, 'favicon.svg'));
  } catch {
    // ignore missing favicon
  }
}

async function writeIndexHtml() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Admin Dashboard for managing users, reports, analytics, and dashboard data from a clean workspace." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/bundle.css" />
    <title>Admin Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`;

  await writeFile(path.join(outDir, 'index.html'), html);
}

async function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    build().then(() => {
      console.log('Frontend rebuilt');
    }).catch((err) => {
      console.error(`Frontend rebuild failed: ${err.message}`);
    });
  }, 150);
}

function watchDir(dir) {
  try {
    fs.watch(dir, { recursive: true }, scheduleRebuild);
  } catch {
    // Some environments do not support recursive watch; the last build still serves.
  }
}

async function sendFile(res, filePath) {
  try {
    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(filePath));
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/index.html') {
    await sendFile(res, path.join(outDir, 'index.html'));
    return;
  }

  if (pathname === '/favicon.svg') {
    await sendFile(res, path.join(outDir, 'favicon.svg'));
    return;
  }

  if (pathname === '/bundle.js' || pathname === '/bundle.css' || pathname.startsWith('/assets/')) {
    await sendFile(res, path.join(outDir, pathname.replace(/^\//, '')));
    return;
  }

  await sendFile(res, path.join(outDir, 'index.html'));
}

async function main() {
  if (mode === 'build') {
    await build();
    return;
  }

  await rm(outDir, { recursive: true, force: true });
  await build();
  watchDir(srcDir);
  watchDir(publicDir);

  const server = createServer(handler);
  server.listen(port, host, () => {
    console.log(`Frontend running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Change PORT in frontend/.env or stop the process using that port.`);
      process.exit(1);
    }

    throw err;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
