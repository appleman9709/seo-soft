const test = require('node:test');
const assert = require('node:assert/strict');

const { createLlmClient, MockLlmClient } = require('../packages/shared/llm');

test('USE_LLM=false uses MockLlmClient fallback', async () => {
  const client = createLlmClient({ USE_LLM: 'false' });
  assert.ok(client instanceof MockLlmClient);

  const result = await client.generateMetaAndSchema({ title: 'hello world' });
  assert.equal(result.meta.title, 'Hello World');
});

test('USE_LLM=true still works and currently falls back to MockLlmClient', async () => {
  const client = createLlmClient({ USE_LLM: 'true' });
  assert.ok(client instanceof MockLlmClient);

  const result = await client.generateMetaAndSchema({ title: 'seo soft' });
  assert.equal(result.meta.canonicalUrl, 'https://example.com/seo-soft');
});

test('MockLlmClient is deterministic', async () => {
  const client = new MockLlmClient();
  const input = { title: 'Deterministic Output', description: 'Always same' };

  const a = await client.generateMetaAndSchema(input);
  const b = await client.generateMetaAndSchema(input);

  assert.deepEqual(a, b);
});
