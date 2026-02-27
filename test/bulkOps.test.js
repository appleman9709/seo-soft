import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuditLogs, getGenerationResults, getRows, runBulkOperation } from '../src/backend/bulkOps.js';
import { resetStore } from '../src/backend/store.js';

test.beforeEach(() => {
  resetStore();
});

test('findReplace returns preview only in dryRun', () => {
  const result = runBulkOperation(
    {
      operation: 'findReplace',
      payload: { fields: ['meta.title'], find: 'title', replace: 'heading', scope: 'selected' },
    },
    { dryRun: true },
  );

  assert.equal(result.changedCount, 2);
  assert.equal(getAuditLogs().length, 0);
  assert.equal(getGenerationResults().length, 0);
});

test('prefixSuffix writes audit logs and generation versions', () => {
  runBulkOperation(
    {
      operation: 'prefixSuffix',
      payload: { fields: ['meta.title'], prefix: '[P] ', suffix: ' [S]', scope: 'selected' },
    },
    { dryRun: false },
  );

  runBulkOperation(
    {
      operation: 'prefixSuffix',
      payload: { fields: ['meta.title'], prefix: '[P2] ', suffix: '', scope: 'selected' },
    },
    { dryRun: false },
  );

  const logs = getAuditLogs();
  const results = getGenerationResults().filter((v) => v.rowId === 'row-1' && v.fieldPath === 'meta.title');

  assert.ok(logs.length >= 2);
  assert.deepEqual(results.map((r) => r.version), [1, 2]);
});

test('applyTemplate changes fields in scope', () => {
  runBulkOperation(
    {
      operation: 'applyTemplate',
      payload: { templateId: 'template-seo', fields: 'meta', scope: 'filtered' },
    },
    { dryRun: false },
  );

  const rows = getRows();
  assert.equal(rows.find((r) => r.id === 'row-2').meta.title, 'SEO row-2 title');
  assert.equal(rows.find((r) => r.id === 'row-3').meta.title, 'Gamma title');
});
