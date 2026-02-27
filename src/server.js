import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TemplateStore, allowedPlaceholders } from './templateStore.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const store = new TemplateStore();

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(raw);
}

function badRequest(res, message) {
  return json(res, 400, { error: message });
}

function parseIdFromPath(pathname, segment) {
  const match = pathname.match(segment);
  if (!match) return null;
  return Number(match[1]);
}

function serveStatic(pathname, res) {
  const map = {
    '/': 'index.html',
    '/templates': 'templates.html',
    '/templates.js': 'templates.js',
    '/styles.css': 'styles.css'
  };

  const file = map[pathname];
  if (!file) return false;

  return readFile(join(publicDir, file))
    .then((content) => {
      const extension = extname(file);
      const contentType = extension === '.html'
        ? 'text/html; charset=utf-8'
        : extension === '.css'
          ? 'text/css; charset=utf-8'
          : 'text/javascript; charset=utf-8';

      res.writeHead(200, { 'content-type': contentType });
      res.end(content);
      return true;
    })
    .catch(() => {
      res.writeHead(404);
      res.end('Not found');
      return true;
    });
}

async function handleApi(req, res, pathname, searchParams) {
  try {
    if (req.method === 'GET' && pathname === '/api/placeholders') {
      return json(res, 200, { placeholders: allowedPlaceholders() });
    }

    if (req.method === 'GET' && /^\/projects\/\d+\/templates$/.test(pathname)) {
      const projectId = parseIdFromPath(pathname, /^\/projects\/(\d+)\/templates$/);
      const kind = searchParams.get('kind') ?? undefined;
      const entityType = searchParams.get('entityType') ?? undefined;
      const lang = searchParams.has('lang') ? searchParams.get('lang') : undefined;
      const templates = store.listByProject(projectId, { kind, entityType, lang });
      return json(res, 200, { templates });
    }

    if (req.method === 'POST' && /^\/projects\/\d+\/templates$/.test(pathname)) {
      const projectId = parseIdFromPath(pathname, /^\/projects\/(\d+)\/templates$/);
      const body = await parseBody(req);
      const template = store.create({
        projectId,
        kind: body.kind,
        entityType: body.entityType,
        lang: body.lang,
        body: body.body
      });
      return json(res, 201, { template });
    }

    if (req.method === 'POST' && /^\/templates\/\d+\/clone$/.test(pathname)) {
      const templateId = parseIdFromPath(pathname, /^\/templates\/(\d+)\/clone$/);
      const body = await parseBody(req);
      const template = store.clone(templateId, { body: body.body });
      return json(res, 201, { template });
    }

    if (req.method === 'PATCH' && /^\/templates\/\d+$/.test(pathname)) {
      const templateId = parseIdFromPath(pathname, /^\/templates\/(\d+)$/);
      const body = await parseBody(req);
      const template = store.patch(templateId, body);
      return json(res, 201, { template });
    }

    if (req.method === 'POST' && /^\/templates\/\d+\/set-default$/.test(pathname)) {
      const templateId = parseIdFromPath(pathname, /^\/templates\/(\d+)\/set-default$/);
      const template = store.setDefault(templateId);
      return json(res, 200, { template });
    }

    if (req.method === 'POST' && pathname === '/generate') {
      const body = await parseBody(req);
      const template = store.resolveForGeneration({
        projectId: Number(body.projectId),
        kind: body.kind,
        entityType: body.entityType,
        lang: body.lang,
        templateId: body.templateId ? Number(body.templateId) : undefined
      });

      if (!template) {
        return badRequest(res, 'No default template found for requested scope.');
      }

      const output = store.render(template, body.values ?? {});
      return json(res, 200, { templateId: template.id, version: template.version, output });
    }

    return false;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest(res, 'Invalid JSON body.');
    }

    if (error.message.includes('not found')) {
      return json(res, 404, { error: error.message });
    }

    return badRequest(res, error.message);
  }
}

export function createAppServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const handled = await handleApi(req, res, url.pathname, url.searchParams);
    if (handled !== false) return;

    const staticHandled = await serveStatic(url.pathname, res);
    if (staticHandled) return;

    res.writeHead(404);
    res.end('Not found');
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const port = Number(process.env.PORT ?? 3000);
  createAppServer().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
  });
}
