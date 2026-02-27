'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { exportProjectToJson } = require('../src/jsonExport');

test('exportProjectToJson returns the integrator-friendly shape', () => {
  const payload = exportProjectToJson({
    project: { id: 'project-1', name: 'SEO Soft' },
    exportedAt: '2026-02-26T00:00:00.000Z',
    rows: [
      {
        url: '/products/1',
        entityType: 'product',
        status: 'ready',
        languages: {
          ru: {
            title: 'Заголовок',
            description: 'Описание',
            h1: 'H1 RU',
            schemaJsonLd: { '@type': 'Product' },
            validations: ['title-ok'],
          },
          en: {
            title: 'Title',
            description: 'Description',
            h1: 'H1 EN',
            schemaJsonLd: null,
            validations: ['description-ok'],
          },
        },
      },
    ],
  });

  assert.deepEqual(payload, {
    project: { id: 'project-1', name: 'SEO Soft' },
    exportedAt: '2026-02-26T00:00:00.000Z',
    rows: [
      {
        url: '/products/1',
        entityType: 'product',
        status: 'ready',
        languages: {
          ru: {
            title: 'Заголовок',
            description: 'Описание',
            h1: 'H1 RU',
            schemaJsonLd: { '@type': 'Product' },
            validations: ['title-ok'],
          },
          kk: {
            title: '',
            description: '',
            h1: '',
            schemaJsonLd: null,
            validations: [],
          },
          en: {
            title: 'Title',
            description: 'Description',
            h1: 'H1 EN',
            schemaJsonLd: null,
            validations: ['description-ok'],
          },
        },
      },
    ],
  });
});

test('exportProjectToJson throws when exportedAt is invalid', () => {
  assert.throws(
    () => exportProjectToJson({ exportedAt: 'bad-date' }),
    /must be a valid Date/
  );
});
