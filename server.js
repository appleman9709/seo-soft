const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestPath = new URL(req.url, 'http://localhost').pathname;

  if (requestPath === '/' || requestPath === '/report') {
    return sendFile(res, path.join(publicDir, 'report.html'));
  }

  if (requestPath === '/table') {
    return sendFile(res, path.join(publicDir, 'table.html'));
  }

  const staticPath = path.join(publicDir, requestPath);
  if (staticPath.startsWith(publicDir)) {
    return sendFile(res, staticPath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`SEO Soft app running at http://localhost:${port}`);
});
