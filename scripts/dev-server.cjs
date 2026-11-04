// Local static pages plus the same media handlers used by Vercel.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../api/media');
const mediaAdmin = require('../api/media-admin');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(req.method === 'HEAD' ? '' : JSON.stringify(value)); };
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (url.pathname === '/api/media') return media(req, res);
  if (url.pathname === '/api/media-admin') return mediaAdmin(req, res);
  if (url.pathname.startsWith('/api/')) return res.status(503).json({ ok: false, error: 'Local lead delivery is disabled. No request was sent.' });
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end('Method not allowed');
  try {
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.split('/').some(part => part.startsWith('.')) || /^\/(?:server|config|tests|node_modules|scripts|partials)(?:\/|$)/.test(decoded)) throw new Error('Private path');
    let file = path.resolve(root, '.' + decoded);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    let stat = await fs.stat(file).catch(() => null);
    if (stat?.isDirectory()) file = path.join(file, 'index.html');
    else if (!stat && !path.extname(file)) file += '.html';
    if (!mime[path.extname(file)]) throw new Error('Unsupported file');
    const content = await fs.readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)]); res.setHeader('Cache-Control', 'no-cache');
    res.end(req.method === 'HEAD' ? '' : content);
  } catch { res.status(404).end('Not found'); }
}).listen(4173, '0.0.0.0', () => console.log('Capital Upfitters local preview at port 4173 (lead delivery disabled).'));
