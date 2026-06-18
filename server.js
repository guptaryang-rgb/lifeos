// LifeOS — Local Development Server
// Run: node server.js
// Then open: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request({
      host: 'localhost',
      port: 4000,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(502);
      res.end('Bad Gateway: Next.js backend offline');
    });

    req.pipe(proxyReq);
    return;
  }

  // Sanitize the URL path to prevent path traversal attacks
  const ROOT_DIR = __dirname;
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  // Strip query strings and hash fragments before resolving
  urlPath = urlPath.split('?')[0].split('#')[0];
  const filePath = path.resolve(ROOT_DIR, '.' + decodeURIComponent(urlPath));

  // Block any path that escapes the server root
  if (!filePath.startsWith(ROOT_DIR + path.sep) && filePath !== ROOT_DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Serve index.html for SPA routing
        fs.readFile(path.join(__dirname, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
  ⚡ LifeOS Development Server
  ────────────────────────────
  🌐 Local:   http://localhost:${PORT}
  📁 Serving: ${__dirname}
  
  Press Ctrl+C to stop
  `);
});
