const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rows = new Map();
let nextVersionId = 100;

function createVersion({ content, actor, createdAt = new Date().toISOString(), rolledBackFrom = null }) {
  return {
    id: String(nextVersionId++),
    content,
    actor,
    createdAt,
    rolledBackFrom,
  };
}

function getLangBucket(rowId, lang = 'en') {
  if (!rows.has(rowId)) rows.set(rowId, {});
  const row = rows.get(rowId);
  if (!row[lang]) row[lang] = [];
  return row[lang];
}

function seed() {
  const en = getLangBucket('1', 'en');
  if (en.length === 0) {
    en.push(createVersion({ content: 'First draft\nWith two lines', actor: 'alice', createdAt: '2026-02-20T09:00:00.000Z' }));
    en.push(createVersion({ content: 'Second draft\nWith improved wording', actor: 'bob', createdAt: '2026-02-21T12:00:00.000Z' }));
    en.push(createVersion({ content: 'Final text\nReady to publish', actor: 'carol', createdAt: '2026-02-22T18:00:00.000Z' }));
  }
}
seed();

function writeJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function collectJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, 'public', safePath);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = ext === '.js' ? 'text/javascript' : 'text/html';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const historyMatch = requestUrl.pathname.match(/^\/rows\/([^/]+)\/history$/);
  const rollbackMatch = requestUrl.pathname.match(/^\/rows\/([^/]+)\/rollback$/);

  if (req.method === 'GET' && historyMatch) {
    const rowId = decodeURIComponent(historyMatch[1]);
    const lang = requestUrl.searchParams.get('lang') || 'en';
    const versions = getLangBucket(rowId, lang);

    writeJson(res, 200, {
      rowId,
      lang,
      generationResults: versions.map((v) => ({ ...v })),
    });
    return;
  }

  if (req.method === 'POST' && rollbackMatch) {
    const rowId = decodeURIComponent(rollbackMatch[1]);

    try {
      const { lang = 'en', versionId, actor = 'system' } = await collectJson(req);

      if (!versionId) {
        writeJson(res, 400, { error: 'versionId is required' });
        return;
      }

      const versions = getLangBucket(rowId, lang);
      const selected = versions.find((v) => v.id === String(versionId));
      if (!selected) {
        writeJson(res, 404, { error: 'version not found' });
        return;
      }

      const rolledVersion = createVersion({ content: selected.content, actor, rolledBackFrom: selected.id });
      versions.push(rolledVersion);
      writeJson(res, 201, { message: 'rollback created', version: rolledVersion });
    } catch (error) {
      writeJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET') {
    serveStatic(res, requestUrl.pathname);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

function createServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch(() => {
      res.writeHead(500);
      res.end('Internal error');
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { createServer, getLangBucket, rows };
