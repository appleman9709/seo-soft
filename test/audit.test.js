import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

async function request(base, method, path, body, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    json: await response.json(),
  };
}

test('writes audit entries for required operations and reads paginated audit history', async () => {
  process.env.NODE_ENV = 'test';
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const user = { 'x-user-id': 'alice' };
  const projectId = 'p1';

  const calls = [
    ['POST', `/projects/${projectId}/import`, { importedRows: 10, source: 'csv' }],
    ['POST', `/projects/${projectId}/generate/start`, { runId: 'run-1', prompt: 'seo' }],
    ['POST', `/projects/${projectId}/generate/finish`, { runId: 'run-1', status: 'success' }],
    ['POST', `/projects/${projectId}/templates`, { templateId: 't1', name: 'Main' }],
    ['PUT', `/projects/${projectId}/templates/t1`, { name: 'Main v2' }],
    ['POST', `/projects/${projectId}/templates/t1/default`, {}],
    ['PATCH', `/projects/${projectId}/rows/r1`, { title: 'updated' }],
    ['POST', `/projects/${projectId}/bulk`, { operation: 'delete', count: 3 }],
    ['POST', `/projects/${projectId}/export`, { format: 'xlsx' }],
  ];

  for (const [method, path, body] of calls) {
    const result = await request(base, method, path, body, user);
    assert.ok(result.status >= 200 && result.status < 300, `${method} ${path} failed`);
  }

  const page1 = await request(base, 'GET', `/projects/${projectId}/audit?page=1&pageSize=5`);
  assert.equal(page1.status, 200);
  assert.equal(page1.json.total, 9);
  assert.equal(page1.json.data.length, 5);

  const actions = new Set(page1.json.data.map((entry) => entry.action));
  assert.ok(actions.has('export'));

  const full = await request(base, 'GET', `/projects/${projectId}/audit?page=1&pageSize=20`);
  const fullActions = new Set(full.json.data.map((entry) => entry.action));
  const expected = [
    'import',
    'generate_run_start',
    'generate_run_finish',
    'template_create',
    'template_update',
    'template_set_default',
    'row_edit',
    'bulk_operation',
    'export',
  ];

  for (const action of expected) {
    assert.ok(fullActions.has(action), `missing audit action: ${action}`);
  }

  const entry = full.json.data[0];
  assert.ok(entry.actor);
  assert.ok(entry.createdAt);
  assert.ok(entry.targetType);

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
