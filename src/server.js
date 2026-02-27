import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createGenerationRun, getGenerationRun } from './generationRunStore.js';
import { enqueueGenerationRun } from './generationQueue.js';

const port = Number(process.env.PORT ?? 3000);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

const server = createServer((req, res) => {
  if (!req.url || !req.method) {
    return notFound(res);
  }

  if (req.method === 'GET' && req.url === '/') {
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    return sendHtml(res, html);
  }

  if (req.method === 'POST' && /^\/projects\/[^/]+\/generate$/.test(req.url)) {
    const parts = req.url.split('/');
    const projectId = parts[2];
    const id = randomUUID();

    createGenerationRun({
      id,
      projectId,
      status: 'queued',
      progress: 0,
      totals: 0,
      startedAt: null,
      finishedAt: null,
      error: null,
      errors: []
    });

    enqueueGenerationRun(id);

    return sendJson(res, 202, { generationRunId: id });
  }

  if (req.method === 'GET' && /^\/generation-runs\/[^/]+$/.test(req.url)) {
    const id = req.url.split('/')[2];
    const run = getGenerationRun(id);
    if (!run) {
      return sendJson(res, 404, { error: 'Generation run not found' });
    }

    return sendJson(res, 200, run);
  }

  return notFound(res);
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
