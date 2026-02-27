import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchemaJsonLd } from '../src/schemaValidation.js';

test('invalid JSON blocks export and highlights JSON input', () => {
  const result = validateSchemaJsonLd('{"@context":');
  assert.equal(result.canExportHtmlSnippet, false);
  assert.equal(result.highlightInvalidJson, true);
  assert.equal(result.errors[0].path, '');
});

test('Product validations include warnings and errors with pointers', () => {
  const result = validateSchemaJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Hat',
    offers: {}
  });

  assert.equal(result.canExportHtmlSnippet, false);
  assert.deepEqual(result.errors.map((x) => x.path), ['/offers/availability']);
  assert.ok(result.warnings.some((x) => x.path === '/image'));
});

test('FAQPage enforces mainEntity Question/Answer structure', () => {
  const result = validateSchemaJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question' }],
  });

  assert.equal(result.errors[0].path, '/mainEntity/0/acceptedAnswer');
});

test('Array payload validates each node pointer location', () => {
  const result = validateSchemaJsonLd([
    { '@context': 'https://schema.org', '@type': 'Article', headline: 'H1', datePublished: '2024-01-01' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Org' }
  ]);

  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((x) => x.path === '/0/author'));
  assert.ok(result.warnings.some((x) => x.path === '/1/url'));
  assert.ok(result.warnings.some((x) => x.path === '/1/logo'));
});
