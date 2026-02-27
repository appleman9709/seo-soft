import type { Row, Template } from '@prisma/client';

const applyTemplate = (template: string, sourceFields: Record<string, unknown>) =>
  template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = sourceFields[key];
    return value ? String(value) : '';
  });

export function deterministicGeneration(row: Row, templates: Template[], lang: string) {
  const sourceFields = row.sourceFields as Record<string, unknown>;
  const metaTemplate = templates.find((t) => t.kind === 'meta' && (t.lang === lang || t.lang === null));
  const schemaTemplate = templates.find((t) => t.kind === 'schema' && (t.lang === lang || t.lang === null));

  const metaTitle = metaTemplate
    ? applyTemplate(metaTemplate.body, sourceFields).slice(0, 60)
    : `${row.entityType} | ${row.url}`;

  const metaDescription = `Generated for ${row.url} (${lang})`;
  const h1 = sourceFields.title ? String(sourceFields.title) : `${row.entityType} Overview`;

  const schemaJsonLd = schemaTemplate
    ? applyTemplate(schemaTemplate.body, sourceFields)
    : JSON.stringify({ '@context': 'https://schema.org', '@type': row.entityType, url: row.url }, null, 2);

  return {
    metaTitle,
    metaDescription,
    h1,
    schemaJsonLd,
    validations: {
      titleLength: metaTitle.length,
      descriptionLength: metaDescription.length,
      passes: metaTitle.length > 10 && metaDescription.length > 20
    }
  };
}
