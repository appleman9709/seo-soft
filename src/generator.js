import { getDefaultTemplateIds, store } from "./data.js";

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function formatAttrs(attrs) {
  if (!attrs || typeof attrs !== "object") {
    return "";
  }

  return Object.entries(attrs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function renderTemplate(content, sourceFields) {
  return content.replace(PLACEHOLDER_PATTERN, (_, fieldName) => {
    if (fieldName === "attrs") {
      return formatAttrs(sourceFields.attrs);
    }

    const value = sourceFields[fieldName];
    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  });
}

export function validateRender(renderedText, template, sourceFields) {
  const missingSchemaFields = template.schemaFields.filter((field) => {
    const value = sourceFields[field];
    if (field === "attrs") {
      return !value || Object.keys(value).length === 0;
    }

    return value === undefined || value === null || value === "";
  });

  return {
    maxLength: template.maxLength,
    length: renderedText.length,
    lengthValid: renderedText.length <= template.maxLength,
    missingSchemaFields
  };
}

function parseCursor(cursorValue) {
  if (!cursorValue) {
    return 0;
  }

  const parsed = Number.parseInt(cursorValue, 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function selectRows(project, payload) {
  if (Array.isArray(payload.rowIds) && payload.rowIds.length > 0) {
    const selected = new Set(payload.rowIds.map(String));
    return project.rows.filter((row) => selected.has(row.id));
  }

  const status = payload.filter?.status;
  const entityType = payload.filter?.entityType;

  return project.rows.filter((row) => {
    const statusMatches = status ? row.status === status : true;
    const entityMatches = entityType ? row.entityType === entityType : true;
    return statusMatches && entityMatches;
  });
}

function selectTemplates(payload) {
  const ids = payload.templateIds?.length ? payload.templateIds : getDefaultTemplateIds();
  return store.templates.filter((template) => ids.includes(template.id));
}

function getLatestVersion(projectId, rowId, language) {
  const candidates = store.generationResults.filter(
    (result) => result.projectId === projectId && result.rowId === rowId && result.language === language
  );

  if (!candidates.length) {
    return 0;
  }

  return Math.max(...candidates.map((candidate) => candidate.version));
}

export function enqueueGeneration(project, payload) {
  const rows = selectRows(project, payload);
  const templates = selectTemplates(payload);
  const languages = payload.languages || [];
  const batchSize = payload.batchSize || 100;
  const cursor = parseCursor(payload.cursor);

  const job = {
    id: crypto.randomUUID(),
    projectId: project.id,
    status: "running",
    cursor,
    batchSize,
    totalRows: rows.length,
    processedRows: 0,
    rows,
    templates,
    languages,
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdCount: 0
  };

  const end = Math.min(cursor + batchSize, rows.length);
  const batchRows = rows.slice(cursor, end);

  for (const row of batchRows) {
    for (const language of languages) {
      const version = getLatestVersion(project.id, row.id, language) + 1;
      const renderedFields = {};
      const validations = {};

      for (const template of templates) {
        const renderedText = renderTemplate(template.content, row.sourceFields);
        renderedFields[template.targetField] = renderedText;
        validations[template.targetField] = validateRender(renderedText, template, row.sourceFields);
      }

      store.generationResults.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        rowId: row.id,
        language,
        version,
        renderedFields,
        validations,
        createdAt: new Date().toISOString()
      });

      job.createdCount += 1;
    }

    job.processedRows += 1;
  }

  job.cursor = end;
  if (end >= rows.length) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
  }

  store.jobs.push(job);

  return {
    jobId: job.id,
    status: job.status,
    cursor: job.cursor,
    nextCursor: job.status === "completed" ? null : String(job.cursor),
    batchSize,
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    createdCount: job.createdCount
  };
}

export function getJob(jobId) {
  return store.jobs.find((job) => job.id === jobId);
}
