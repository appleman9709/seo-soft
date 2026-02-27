import test from 'node:test';
import assert from 'node:assert/strict';
import { store, getProject } from '../src/data.js';
import { enqueueGeneration, formatAttrs, renderTemplate } from '../src/generator.js';

test('formats attrs and renders placeholders deterministically', () => {
  const attrs = formatAttrs({ wifi: 'yes', parking: 'no' });
  assert.equal(attrs, 'wifi: yes, parking: no');

  const output = renderTemplate('Hello {{name}} {{attrs}}', {
    name: 'Entity',
    attrs: { wifi: 'yes' }
  });

  assert.equal(output, 'Hello Entity wifi: yes');
});

test('generates 1000 rows in batches of 100 and increments versions', () => {
  store.generationResults = [];
  store.jobs = [];
  const project = getProject('1');

  let cursor = null;
  let loops = 0;
  do {
    const response = enqueueGeneration(project, {
      filter: {},
      languages: ['en'],
      cursor,
      batchSize: 100
    });
    cursor = response.nextCursor;
    loops += 1;
  } while (cursor !== null);

  assert.equal(loops, 10);
  assert.equal(store.generationResults.length, 1000);

  const rerun = enqueueGeneration(project, {
    rowIds: ['1'],
    languages: ['en'],
    batchSize: 100
  });

  assert.equal(rerun.status, 'completed');
  const versions = store.generationResults
    .filter((result) => result.rowId === '1' && result.language === 'en')
    .map((result) => result.version)
    .sort((a, b) => a - b);

  assert.deepEqual(versions, [1, 2]);
});
