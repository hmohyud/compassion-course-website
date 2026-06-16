#!/usr/bin/env node
/**
 * preview-dist-server.cjs — serve the built `dist/` exactly like Firebase
 * Hosting will in production, so we can verify the prerender + hydration
 * locally. Rules mirror firebase.json:
 *   - real files in dist/ are served first (assets, robots.txt, nested
 *     prerendered index.html, etc.)
 *   - trailingSlash: true → /about and /about/ both resolve to
 *     dist/about/index.html
 *   - everything else (unknown SPA routes like /portal/leadership) rewrites to
 *     dist/index.html
 * Local verification only; never shipped.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 5055;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
};

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function resolveFile(urlPath) {
  // Strip query/hash, decode, prevent traversal.
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (!p.startsWith('/')) p = '/' + p;
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const abs = path.join(ROOT, safe);
  if (!abs.startsWith(ROOT)) return null;

  if (p === '/' ) return path.join(ROOT, 'index.html');
  if (isFile(abs)) return abs;                       // real file (asset, .html, etc.)
  if (p.endsWith('/')) {                              // dir → index.html
    const idx = path.join(abs, 'index.html');
    if (isFile(idx)) return idx;
  } else {                                           // trailingSlash: /about → /about/index.html
    const idx = path.join(abs, 'index.html');
    if (isFile(idx)) return idx;
    if (isFile(abs + '.html')) return abs + '.html';
  }
  return null;                                       // → SPA fallback
}

const server = http.createServer((req, res) => {
  let file = resolveFile(req.url || '/');
  let status = 200;
  if (!file) { file = path.join(ROOT, 'index.html'); status = 200; } // SPA rewrite
  try {
    const body = fs.readFileSync(file);
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(500); res.end('server error: ' + e.message);
  }
});

server.listen(PORT, () => console.log(`[preview-dist-server] serving ${ROOT} on http://localhost:${PORT}`));
