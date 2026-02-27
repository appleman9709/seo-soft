import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { ensureProject, listAuditLog, writeAuditLog } from './store.js';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function getActor(req, body) {
  return req.headers['x-user-id'] || body.actor || 'unknown';
}

function routeMatch(pathname, pattern) {
  const input = pathname.split('/').filter(Boolean);
  const match = pattern.split('/').filter(Boolean);
  if (input.length !== match.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < input.length; i += 1) {
    if (match[i].startsWith(':')) {
      params[match[i].slice(1)] = input[i];
    } else if (match[i] !== input[i]) {
      return null;
    }
  }

  return params;
}

function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;

    try {
      // Import
      let params = routeMatch(pathname, '/projects/:id/import');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        ensureProject(params.id);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'import',
          targetType: 'project',
          targetId: params.id,
          changes: { importedRows: body.importedRows ?? 0 },
          metadata: { source: body.source ?? 'unknown' },
        });
        sendJson(res, 201, { ok: true, audit: entry });
        return;
      }

      // Generate run start
      params = routeMatch(pathname, '/projects/:id/generate/start');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'generate_run_start',
          targetType: 'generation',
          targetId: body.runId ?? null,
          metadata: { prompt: body.prompt ?? null },
        });
        sendJson(res, 201, { ok: true, audit: entry });
        return;
      }

      // Generate run finish
      params = routeMatch(pathname, '/projects/:id/generate/finish');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'generate_run_finish',
          targetType: 'generation',
          targetId: body.runId ?? null,
          metadata: { status: body.status ?? 'unknown' },
        });
        sendJson(res, 201, { ok: true, audit: entry });
        return;
      }

      // Template create
      params = routeMatch(pathname, '/projects/:id/templates');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'template_create',
          targetType: 'template',
          targetId: body.templateId ?? null,
          changes: { name: body.name ?? null },
        });
        sendJson(res, 201, { ok: true, audit: entry });
        return;
      }

      // Template update
      params = routeMatch(pathname, '/projects/:id/templates/:templateId');
      if (req.method === 'PUT' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'template_update',
          targetType: 'template',
          targetId: params.templateId,
          changes: body,
        });
        sendJson(res, 200, { ok: true, audit: entry });
        return;
      }

      // Template default
      params = routeMatch(pathname, '/projects/:id/templates/:templateId/default');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'template_set_default',
          targetType: 'template',
          targetId: params.templateId,
        });
        sendJson(res, 200, { ok: true, audit: entry });
        return;
      }

      // Row edit
      params = routeMatch(pathname, '/projects/:id/rows/:rowId');
      if (req.method === 'PATCH' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'row_edit',
          targetType: 'row',
          targetId: params.rowId,
          changes: body,
        });
        sendJson(res, 200, { ok: true, audit: entry });
        return;
      }

      // Bulk ops
      params = routeMatch(pathname, '/projects/:id/bulk');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'bulk_operation',
          targetType: 'project',
          targetId: params.id,
          metadata: { operation: body.operation ?? 'unknown', count: body.count ?? 0 },
        });
        sendJson(res, 200, { ok: true, audit: entry });
        return;
      }

      // Export
      params = routeMatch(pathname, '/projects/:id/export');
      if (req.method === 'POST' && params) {
        const body = await parseJsonBody(req);
        const actor = getActor(req, body);
        const entry = writeAuditLog({
          projectId: params.id,
          actor,
          action: 'export',
          targetType: 'project',
          targetId: params.id,
          metadata: { format: body.format ?? 'csv' },
        });
        sendJson(res, 201, { ok: true, audit: entry });
        return;
      }

      // Audit listing with pagination
      params = routeMatch(pathname, '/projects/:id/audit');
      if (req.method === 'GET' && params) {
        const page = Number(url.searchParams.get('page') || 1);
        const pageSize = Number(url.searchParams.get('pageSize') || 20);
        const result = listAuditLog(params.id, { page, pageSize });
        sendJson(res, 200, result);
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
  });
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const app = createApp();
  app.listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Listening on http://localhost:3000');
  });
}

export { createApp };
