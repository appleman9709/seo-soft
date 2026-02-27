'use strict';

const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'];

/**
 * Build the export payload used by downstream integrators.
 * The resulting object always contains:
 * - `project`
 * - `exportedAt` (ISO 8601)
 * - `rows`
 *
 * Each row always contains all supported languages (`ru`, `kk`, `en`) with
 * normalized SEO fields.
 *
 * @param {Object} params
 * @param {Object} params.project
 * @param {Array<Object>} params.rows
 * @param {string|Date} [params.exportedAt]
 * @returns {{project: Object, exportedAt: string, rows: Array<Object>}}
 */
function exportProjectToJson({ project = {}, rows = [], exportedAt = new Date() }) {
  return {
    project,
    exportedAt: toIsoString(exportedAt),
    rows: rows.map(normalizeRow),
  };
}

function normalizeRow(row = {}) {
  return {
    url: row.url ?? '',
    entityType: row.entityType ?? '',
    status: row.status ?? '',
    languages: normalizeLanguages(row.languages),
  };
}

function normalizeLanguages(languages = {}) {
  const normalized = {};

  for (const language of SUPPORTED_LANGUAGES) {
    normalized[language] = normalizeLanguageSeo(languages[language]);
  }

  return normalized;
}

function normalizeLanguageSeo(seo = {}) {
  return {
    title: seo.title ?? '',
    description: seo.description ?? '',
    h1: seo.h1 ?? '',
    schemaJsonLd: seo.schemaJsonLd ?? null,
    validations: Array.isArray(seo.validations) ? seo.validations : [],
  };
}

function toIsoString(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('`exportedAt` must be a valid Date or date-like string.');
  }

  return parsed.toISOString();
}

module.exports = {
  SUPPORTED_LANGUAGES,
  exportProjectToJson,
};
