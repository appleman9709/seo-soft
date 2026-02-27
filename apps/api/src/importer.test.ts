import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { normalizeRows, parseInputFile, processImport } from './importer.js';

const mapping = {
  'Ссылка': 'url',
  'Тип сущности': 'entityType',
  'Название': 'name',
  'attr_цвет': 'attr_color',
};

describe('import parser', () => {
  it('parses csv with russian headers and warns duplicates/missing', () => {
    const csv = `Ссылка,Тип сущности,Название,attr_цвет\nhttps://a.ru,product,Товар A,красный\nhttps://a.ru,product,Товар B,синий\n,category,Категория,зеленый`;
    const rows = parseInputFile(Buffer.from(csv, 'utf-8'), 'text/csv', 'import.csv');
    const normalized = normalizeRows(rows, mapping);
    const result = processImport(normalized);

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]?.code).toBe('DUPLICATE_URL');
    expect(result.warnings[1]?.code).toBe('MISSING_REQUIRED');
    expect(result.sample[0]?.sourceFields['attr_цвет']).toBe('красный');
  });

  it('parses xlsx and normalizes required fields', () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Ссылка: 'https://x.ru', 'Тип сущности': 'brand', Название: 'Бренд X' },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const rows = parseInputFile(
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'import.xlsx',
    );
    const normalized = normalizeRows(rows, mapping);
    const result = processImport(normalized);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.sample[0]).toMatchObject({ url: 'https://x.ru', entityType: 'brand', name: 'Бренд X' });
  });
});
