import * as XLSX from 'xlsx';
import type { ImportResult, Mapping, NormalizedRow, Warning } from './types.js';

const REQUIRED_FIELDS = ['url', 'entityType', 'name'] as const;
type ParsedInput = Record<string, unknown>[];

function parseCsv(content: string): ParsedInput {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, unknown>>((acc, h, i) => {
      acc[h] = values[i]?.trim() ?? '';
      return acc;
    }, {});
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function parseXlsx(buffer: Buffer): ParsedInput {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

export function parseInputFile(buffer: Buffer, mimetype: string, filename: string): ParsedInput {
  if (mimetype === 'text/csv' || filename.toLowerCase().endsWith('.csv')) return parseCsv(buffer.toString('utf-8'));
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || filename.toLowerCase().endsWith('.xlsx')) return parseXlsx(buffer);
  throw new Error('Unsupported file type. Only CSV and XLSX are allowed.');
}

export function normalizeRows(rows: ParsedInput, mapping: Mapping): NormalizedRow[] {
  return rows.map((row, idx) => {
    const normalized: NormalizedRow = { rowIndex: idx + 2, sourceFields: { ...row } };
    Object.entries(mapping).forEach(([fileColumn, internalField]) => {
      const raw = row[fileColumn];
      const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
      if (value) normalized[internalField as 'url'] = value;
    });
    return normalized;
  });
}

export function processImport(normalizedRows: NormalizedRow[]): ImportResult {
  const warnings: Warning[] = [];
  const sample = normalizedRows.slice(0, 20);
  const duplicateTracker = new Map<string, number>();
  let imported = 0;
  let skipped = 0;

  normalizedRows.forEach((row) => {
    const missing = REQUIRED_FIELDS.filter((field) => !row[field]);
    if (missing.length) {
      warnings.push({ rowIndex: row.rowIndex, code: 'MISSING_REQUIRED', message: `Missing required fields: ${missing.join(', ')}` });
      skipped += 1;
      return;
    }
    const key = String(row.url).toLowerCase();
    if (duplicateTracker.has(key)) {
      warnings.push({ rowIndex: row.rowIndex, code: 'DUPLICATE_URL', message: `Duplicate url found in file. First seen at row ${duplicateTracker.get(key)}.` });
    } else duplicateTracker.set(key, row.rowIndex);
    imported += 1;
  });

  return { imported, skipped, warnings, sample };
}
