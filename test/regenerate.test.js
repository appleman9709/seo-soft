import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

async function withServer(run) {
  const server = createServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    await run(port);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

test('Draft and Review rows regenerate without force', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/rows/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIds: [1, 2], languages: ['en'], force: false }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.results.every((row) => row.regenerated), true);
  });
});

test('Approved rows require force=true', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/rows/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIds: [3], languages: ['en'], force: false }),
    });

    assert.equal(response.status, 207);
    const body = await response.json();
    assert.match(body.results[0].reason, /force=true/);
  });
});

test('Exported rows require Admin role', async () => {
  await withServer(async (port) => {
    const userRes = await fetch(`http://127.0.0.1:${port}/rows/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIds: [4], languages: ['en'], force: true }),
    });
    assert.equal(userRes.status, 207);

    const adminRes = await fetch(`http://127.0.0.1:${port}/rows/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({ rowIds: [4], languages: ['en'], force: true }),
    });
    assert.equal(adminRes.status, 200);
  });
});
