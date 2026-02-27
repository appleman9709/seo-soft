const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, getLangBucket } = require('../server');

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('GET /rows/:id/history returns generationResult versions with actor/timestamp', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/rows/1/history?lang=en`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.rowId, '1');
    assert.equal(body.lang, 'en');
    assert.ok(Array.isArray(body.generationResults));

    const version = body.generationResults[0];
    assert.ok(version.id);
    assert.ok(version.actor);
    assert.ok(version.createdAt);
  });
});

test('POST /rows/:id/rollback creates a new version matching selected content', async () => {
  await withServer(async (baseUrl) => {
    const target = getLangBucket('1', 'en')[0];

    const response = await fetch(`${baseUrl}/rows/1/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: 'en', versionId: target.id, actor: 'qa-user' }),
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.version.content, target.content);
    assert.equal(body.version.actor, 'qa-user');
    assert.equal(body.version.rolledBackFrom, target.id);

    const latest = getLangBucket('1', 'en').at(-1);
    assert.equal(latest.id, body.version.id);
  });
});
