const initialRows = [
  {
    id: 'row-1',
    selected: true,
    filtered: true,
    meta: { title: 'Alpha title', description: 'Alpha description' },
    schema: { headline: 'Alpha headline', summary: 'Alpha summary' },
  },
  {
    id: 'row-2',
    selected: false,
    filtered: true,
    meta: { title: 'Beta title', description: 'Beta description' },
    schema: { headline: 'Beta headline', summary: 'Beta summary' },
  },
  {
    id: 'row-3',
    selected: true,
    filtered: false,
    meta: { title: 'Gamma title', description: 'Gamma description' },
    schema: { headline: 'Gamma headline', summary: 'Gamma summary' },
  },
];

const initialTemplates = {
  'template-seo': {
    meta: {
      title: 'SEO {{id}} title',
      description: 'SEO {{id}} description',
    },
    schema: {
      headline: 'Schema {{id}} headline',
      summary: 'Schema {{id}} summary',
    },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const db = {
  rows: clone(initialRows),
  templates: clone(initialTemplates),
  generationResults: [],
  auditLogs: [],
};

export function getLatestGenerationVersion(rowId, fieldPath) {
  const versions = db.generationResults.filter(
    (r) => r.rowId === rowId && r.fieldPath === fieldPath,
  );
  if (versions.length === 0) {
    return 0;
  }
  return Math.max(...versions.map((v) => v.version));
}

export function resetStore() {
  db.rows = clone(initialRows);
  db.templates = clone(initialTemplates);
  db.generationResults = [];
  db.auditLogs = [];
}
