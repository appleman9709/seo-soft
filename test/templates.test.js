import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/server.js';

async function withServer(run) {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('creates versions and preserves old body', async () => {
  await withServer(async (base) => {
    const createRes = await fetch(`${base}/projects/1/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'meta', entityType: 'product', lang: 'en', body: 'Buy {name}' })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();

    const patchRes = await fetch(`${base}/templates/${created.template.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'Buy {name} in {city}' })
    });
    assert.equal(patchRes.status, 201);
    const patched = await patchRes.json();
    assert.equal(patched.template.version, 2);

    const listRes = await fetch(`${base}/projects/1/templates?kind=meta&entityType=product&lang=en`);
    const list = await listRes.json();
    assert.equal(list.templates.length, 2);

    const v1 = list.templates.find((item) => item.version === 1);
    assert.equal(v1.body, 'Buy {name}');
  });
});

test('enforces one default template per scope and generation can use specific version', async () => {
  await withServer(async (base) => {
    const createRes = await fetch(`${base}/projects/1/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'schema', entityType: 'product', lang: 'en', body: 'v1 {name}' })
    });
    const first = (await createRes.json()).template;

    const cloneRes = await fetch(`${base}/templates/${first.id}/clone`, { method: 'POST' });
    const second = (await cloneRes.json()).template;

    await fetch(`${base}/templates/${first.id}/set-default`, { method: 'POST' });
    await fetch(`${base}/templates/${second.id}/set-default`, { method: 'POST' });

    const listRes = await fetch(`${base}/projects/1/templates?kind=schema&entityType=product&lang=en`);
    const list = (await listRes.json()).templates;
    assert.equal(list.filter((item) => item.isDefault).length, 1);
    assert.equal(list.find((item) => item.id === second.id).isDefault, true);

    const generateDefaultRes = await fetch(`${base}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 1,
        kind: 'schema',
        entityType: 'product',
        lang: 'en',
        values: { name: 'Phone' }
      })
    });
    const byDefault = await generateDefaultRes.json();
    assert.equal(byDefault.templateId, second.id);

    const generateByVersionRes = await fetch(`${base}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 1,
        kind: 'schema',
        entityType: 'product',
        lang: 'en',
        templateId: first.id,
        values: { name: 'Phone' }
      })
    });
    const bySpecific = await generateByVersionRes.json();
    assert.equal(bySpecific.templateId, first.id);
  });
});
