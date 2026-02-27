const ALLOWED_KINDS = new Set(['meta', 'schema']);
const ALLOWED_PLACEHOLDERS = new Set([
  'name',
  'brand',
  'city',
  'price_from',
  'category',
  'year',
  'attrs'
]);

const PLACEHOLDER_REGEX = /\{([a-z_]+)\}/g;

export class TemplateStore {
  constructor() {
    this.templates = [];
    this.nextId = 1;
  }

  static validateTemplateBody(body) {
    if (typeof body !== 'string' || body.trim().length === 0) {
      throw new Error('Template body is required.');
    }

    const unknown = new Set();
    for (const match of body.matchAll(PLACEHOLDER_REGEX)) {
      const name = match[1];
      if (!ALLOWED_PLACEHOLDERS.has(name)) {
        unknown.add(name);
      }
    }

    if (unknown.size > 0) {
      throw new Error(`Unsupported placeholders: ${[...unknown].join(', ')}`);
    }
  }

  static validateKind(kind) {
    if (!ALLOWED_KINDS.has(kind)) {
      throw new Error('kind must be one of: meta, schema.');
    }
  }

  static normalizeLang(lang) {
    if (lang == null || lang === '') {
      return null;
    }

    return String(lang).trim().toLowerCase();
  }

  static matchesScope(template, scope) {
    return (
      template.projectId === scope.projectId
      && template.kind === scope.kind
      && template.entityType === scope.entityType
      && template.lang === scope.lang
    );
  }

  listByProject(projectId, { kind, entityType, lang }) {
    const normalizedLang = TemplateStore.normalizeLang(lang);

    return this.templates.filter((template) => {
      if (template.projectId !== projectId) return false;
      if (kind && template.kind !== kind) return false;
      if (entityType && template.entityType !== entityType) return false;
      if (lang !== undefined && template.lang !== normalizedLang) return false;
      return true;
    });
  }

  latestInChain(rootId) {
    const versions = this.templates.filter((t) => t.rootId === rootId);
    return versions.reduce((latest, current) => {
      if (!latest || current.version > latest.version) return current;
      return latest;
    }, null);
  }

  setDefaultForScope(scope, templateId) {
    for (const template of this.templates) {
      if (TemplateStore.matchesScope(template, scope)) {
        template.isDefault = template.id === templateId;
      }
    }
  }

  create({ projectId, kind, entityType, lang, body }) {
    TemplateStore.validateKind(kind);
    TemplateStore.validateTemplateBody(body);

    const template = {
      id: this.nextId++,
      rootId: null,
      projectId,
      kind,
      entityType,
      lang: TemplateStore.normalizeLang(lang),
      body,
      version: 1,
      isDefault: false,
      createdAt: new Date().toISOString()
    };
    template.rootId = template.id;
    this.templates.push(template);

    return template;
  }

  getById(id) {
    const template = this.templates.find((item) => item.id === id);
    if (!template) throw new Error(`Template ${id} not found.`);
    return template;
  }

  clone(id, { body }) {
    const current = this.getById(id);
    const latest = this.latestInChain(current.rootId);

    const next = {
      ...latest,
      id: this.nextId++,
      body: body ?? latest.body,
      version: latest.version + 1,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    TemplateStore.validateTemplateBody(next.body);
    this.templates.push(next);

    return next;
  }

  patch(id, updates) {
    if (!Object.hasOwn(updates, 'body')) {
      throw new Error('Only body can be updated.');
    }

    return this.clone(id, { body: updates.body });
  }

  setDefault(id) {
    const target = this.getById(id);
    this.setDefaultForScope(target, target.id);
    target.isDefault = true;
    return target;
  }

  resolveForGeneration({ projectId, kind, entityType, lang, templateId }) {
    if (templateId) {
      return this.getById(templateId);
    }

    const normalizedLang = TemplateStore.normalizeLang(lang);
    return this.templates.find((template) => (
      template.projectId === projectId
      && template.kind === kind
      && template.entityType === entityType
      && template.lang === normalizedLang
      && template.isDefault
    )) || null;
  }

  render(template, values) {
    return template.body.replaceAll(PLACEHOLDER_REGEX, (_, key) => {
      if (values[key] == null) {
        return '';
      }
      return String(values[key]);
    });
  }
}

export function allowedPlaceholders() {
  return [...ALLOWED_PLACEHOLDERS];
}
