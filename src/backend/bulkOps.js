import { randomUUID } from 'node:crypto';
import { db, getLatestGenerationVersion } from './store.js';

const VALID_SCOPES = new Set(['selected', 'filtered']);
const VALID_FIELD_GROUPS = new Set(['meta', 'schema']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listRowsByScope(scope) {
  if (!VALID_SCOPES.has(scope)) {
    throw new Error(`Invalid scope: ${scope}`);
  }
  return db.rows.filter((row) => Boolean(row[scope]));
}

function validateFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('fields[] is required');
  }
}

function updateField({ row, fieldPath, before, after, operation, dryRun, details }) {
  if (before === after) {
    return null;
  }

  if (!dryRun) {
    const [group, key] = fieldPath.split('.');
    row[group][key] = after;

    const version = getLatestGenerationVersion(row.id, fieldPath) + 1;
    db.generationResults.push({
      id: randomUUID(),
      rowId: row.id,
      fieldPath,
      value: after,
      version,
      operation,
      createdAt: new Date().toISOString(),
    });

    db.auditLogs.push({
      id: randomUUID(),
      action: 'BULK_OPERATION_APPLIED',
      rowId: row.id,
      operation,
      fieldPath,
      before,
      after,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    rowId: row.id,
    fieldPath,
    before,
    after,
  };
}

function applyFindReplace(payload, dryRun) {
  const { fields, find, replace, scope } = payload;
  validateFields(fields);
  if (typeof find !== 'string' || find.length === 0) {
    throw new Error('find is required');
  }

  const rows = listRowsByScope(scope);
  const changes = [];

  for (const row of rows) {
    for (const fieldPath of fields) {
      const [group, key] = fieldPath.split('.');
      if (!VALID_FIELD_GROUPS.has(group) || !row[group] || !(key in row[group])) {
        throw new Error(`Invalid field: ${fieldPath}`);
      }

      const before = row[group][key];
      const after = before.split(find).join(replace ?? '');
      const result = updateField({
        row,
        fieldPath,
        before,
        after,
        operation: 'findReplace',
        dryRun,
        details: { find, replace: replace ?? '', scope },
      });
      if (result) changes.push(result);
    }
  }

  return changes;
}

function applyPrefixSuffix(payload, dryRun) {
  const { fields, prefix = '', suffix = '', scope } = payload;
  validateFields(fields);
  const rows = scope ? listRowsByScope(scope) : db.rows;
  const changes = [];

  for (const row of rows) {
    for (const fieldPath of fields) {
      const [group, key] = fieldPath.split('.');
      if (!VALID_FIELD_GROUPS.has(group) || !row[group] || !(key in row[group])) {
        throw new Error(`Invalid field: ${fieldPath}`);
      }
      const before = row[group][key];
      const after = `${prefix}${before}${suffix}`;
      const result = updateField({
        row,
        fieldPath,
        before,
        after,
        operation: 'prefixSuffix',
        dryRun,
        details: { prefix, suffix, scope: scope ?? 'all' },
      });
      if (result) changes.push(result);
    }
  }

  return changes;
}

function applyTemplate(payload, dryRun) {
  const { templateId, fields, scope } = payload;
  if (!templateId || !db.templates[templateId]) {
    throw new Error('Valid templateId is required');
  }
  if (!VALID_FIELD_GROUPS.has(fields)) {
    throw new Error('fields must be meta|schema');
  }

  const rows = listRowsByScope(scope);
  const templateFields = db.templates[templateId][fields];
  const changes = [];

  for (const row of rows) {
    for (const [key, tmpl] of Object.entries(templateFields)) {
      const before = row[fields][key];
      const after = tmpl.replaceAll('{{id}}', row.id);
      const result = updateField({
        row,
        fieldPath: `${fields}.${key}`,
        before,
        after,
        operation: 'applyTemplate',
        dryRun,
        details: { templateId, fields, scope },
      });
      if (result) changes.push(result);
    }
  }

  return changes;
}

export function runBulkOperation(input, options = {}) {
  const { operation, payload } = input;
  const dryRun = Boolean(options.dryRun);

  let changes = [];
  if (operation === 'findReplace') {
    changes = applyFindReplace(payload, dryRun);
  } else if (operation === 'prefixSuffix') {
    changes = applyPrefixSuffix(payload, dryRun);
  } else if (operation === 'applyTemplate') {
    changes = applyTemplate(payload, dryRun);
  } else {
    throw new Error(`Unsupported operation: ${operation}`);
  }

  return {
    operation,
    changedCount: changes.length,
    preview: changes.slice(0, 5),
  };
}

export function getAuditLogs() {
  return clone(db.auditLogs);
}

export function getGenerationResults() {
  return clone(db.generationResults);
}

export function getRows() {
  return clone(db.rows);
}
