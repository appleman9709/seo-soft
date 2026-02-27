import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './db.js';
import { app } from './server.js';

describe('POST /module1/import', () => {
  beforeEach(() => {
    resetDb();
  });

  it('returns import counts and warnings', async () => {
    const csv = [
      'Ссылка,Тип сущности,Название',
      'https://a.ru,product,Товар A',
      'https://a.ru,product,Товар B',
      ',category,Категория',
    ].join('\n');

    const mapping = {
      Ссылка: 'url',
      'Тип сущности': 'entityType',
      Название: 'name',
    };

    const response = await request(app)
      .post('/module1/import')
      .field('projectId', 'p1')
      .field('mapping', JSON.stringify(mapping))
      .attach('file', Buffer.from(csv, 'utf-8'), { filename: 'input.csv', contentType: 'text/csv' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      imported: 2,
      skipped: 1,
    });
    expect(response.body.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_URL', rowIndex: 3 }),
        expect.objectContaining({ code: 'MISSING_REQUIRED', rowIndex: 4 }),
      ]),
    );
  });
});
