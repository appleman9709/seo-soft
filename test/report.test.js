import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/index.js';

const startServer = async () => {
  const server = createServer();
  server.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return { server, base };
};

const jsonFetch = async (base, path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) return null;
  return response.json();
};

test('report aggregates issue counts and supports filtering by issue', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  await jsonFetch(base, '/projects/p1/rules', {
    method: 'POST',
    body: JSON.stringify({
      title: { min: 10, max: 20 },
      description: { min: 10, max: 20 },
      h1: { max: 12 },
      keywordRepeatMax: 2,
    }),
  });

  await jsonFetch(base, '/generation-results', {
    method: 'POST',
    body: JSON.stringify({
      projectId: 'p1',
      rowId: 'r1',
      lang: 'en',
      title: 'Cheap flights',
      description: 'cheap cheap cheap deals available now',
      h1: 'Best flights around',
    }),
  });

  await jsonFetch(base, '/generation-results', {
    method: 'POST',
    body: JSON.stringify({
      projectId: 'p1',
      rowId: 'r2',
      lang: 'en',
      title: 'Cheap flights',
      description: 'short',
      h1: 'A super long heading text',
    }),
  });

  const report = await jsonFetch(base, '/report');
  assert.equal(report.totals.rows, 2);
  assert.equal(report.totals.duplicates, 2);
  assert.equal(report.totals.spam, 1);
  assert.equal(report.totals.meta.description, 2);
  assert.equal(report.totals.meta.h1, 2);

  const duplicateRows = await jsonFetch(base, '/generation-results?issue=duplicates');
  assert.equal(duplicateRows.length, 2);

  const spamReport = await jsonFetch(base, '/report?issue=spam');
  assert.equal(spamReport.rows.length, 1);
  assert.equal(spamReport.rows[0].rowId, 'r1');
});
