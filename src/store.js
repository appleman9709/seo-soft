const projects = new Map();
let nextAuditId = 1;

function ensureProject(projectId) {
  if (!projects.has(projectId)) {
    projects.set(projectId, {
      rows: new Map(),
      templates: new Map(),
      defaultTemplateId: null,
      audits: [],
    });
  }

  return projects.get(projectId);
}

function writeAuditLog({ projectId, actor, action, targetType, targetId = null, changes = {}, metadata = {} }) {
  const project = ensureProject(projectId);
  const entry = {
    id: nextAuditId++,
    projectId,
    actor,
    action,
    targetType,
    targetId,
    changes,
    metadata,
    createdAt: new Date().toISOString(),
  };

  project.audits.push(entry);
  return entry;
}

function listAuditLog(projectId, { page = 1, pageSize = 20 } = {}) {
  const project = ensureProject(projectId);
  const start = (page - 1) * pageSize;
  const data = project.audits
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(start, start + pageSize);

  return {
    page,
    pageSize,
    total: project.audits.length,
    data,
  };
}

export { ensureProject, writeAuditLog, listAuditLog };
