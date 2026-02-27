const assert = require('node:assert/strict');
const test = require('node:test');
const { JsonLdDrawerState } = require('../src/jsonLdDrawerState');

const baseResult = {
  id: 'row-1:v1',
  rowId: 'row-1',
  version: 1,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Example',
  },
  createdBy: 'generator',
  createdAt: '2026-02-25T00:00:00.000Z',
};

test('Edit JSON-LD toggles textarea mode', () => {
  const state = new JsonLdDrawerState(baseResult);

  assert.equal(state.isEditMode, false);
  state.toggleEditJsonLd();
  assert.equal(state.isEditMode, true);
  state.toggleEditJsonLd();
  assert.equal(state.isEditMode, false);
});

test('valid manual save creates a new GenerationResult version with createdBy', () => {
  const state = new JsonLdDrawerState(baseResult);

  state.toggleEditJsonLd();
  state.setDraftJson(JSON.stringify({ ...baseResult.jsonLd, headline: 'Fixed headline' }));

  const saved = state.save('manual-editor');

  assert.equal(saved, true);
  assert.equal(state.error, null);
  assert.equal(state.isEditMode, false);
  assert.equal(state.result.rowId, 'row-1');
  assert.equal(state.result.version, 2);
  assert.equal(state.result.id, 'row-1:v2');
  assert.equal(state.result.createdBy, 'manual-editor');
  assert.equal(state.result.jsonLd.headline, 'Fixed headline');
});

test('invalid JSON shows error and does not save', () => {
  const state = new JsonLdDrawerState(baseResult);
  const originalVersion = state.result.version;

  state.toggleEditJsonLd();
  state.setDraftJson('{"@context": "https://schema.org",');

  const saved = state.save('manual-editor');

  assert.equal(saved, false);
  assert.equal(state.error, 'Invalid JSON. Please fix formatting before saving.');
  assert.equal(state.result.version, originalVersion);
  assert.equal(state.isEditMode, true);
});
