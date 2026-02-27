import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAuditLogs, getGenerationResults, getRows, runBulkOperation } from './bulkOps.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND_DIR = join(__dirname, '../frontend');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = join(FRONTEND_DIR, urlPath);
  const ext = extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
  };
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/rows/bulk') {
    try {
      const body = await parseBody(req);
      const result = runBulkOperation(body, { dryRun: body.dryRun });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === 'GET' && req.url === '/rows') return sendJson(res, 200, getRows());
  if (req.method === 'GET' && req.url === '/audit-logs') return sendJson(res, 200, getAuditLogs());
  if (req.method === 'GET' && req.url === '/generation-results') return sendJson(res, 200, getGenerationResults());

  return serveStatic(req, res);
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
