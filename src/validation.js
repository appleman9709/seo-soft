const DEFAULT_RULES = {
  title: { min: 30, max: 65 },
  description: { min: 120, max: 170 },
  h1: { max: 70 },
  keywordRepeatMax: 3,
};

const normalizeToken = (token) => token.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const countTokens = (text) => {
  const counts = new Map();
  for (const raw of text.split(/\s+/)) {
    const token = normalizeToken(raw);
    if (!token) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
};

const getRules = (projectRules = {}) => ({
  title: {
    min: projectRules.title?.min ?? DEFAULT_RULES.title.min,
    max: projectRules.title?.max ?? DEFAULT_RULES.title.max,
  },
  description: {
    min: projectRules.description?.min ?? DEFAULT_RULES.description.min,
    max: projectRules.description?.max ?? DEFAULT_RULES.description.max,
  },
  h1: {
    max: projectRules.h1?.max ?? DEFAULT_RULES.h1.max,
  },
  keywordRepeatMax: projectRules.keywordRepeatMax ?? DEFAULT_RULES.keywordRepeatMax,
});

const lengthValidation = (value, bounds) => {
  const length = value.length;
  const min = bounds.min;
  const max = bounds.max;
  const valid = (min === undefined || length >= min) && (max === undefined || length <= max);
  return {
    valid,
    status: valid ? 'ok' : 'error',
    length,
    min,
    max,
  };
};

const maxValidation = (value, max) => {
  const length = value.length;
  const valid = length <= max;
  return {
    valid,
    status: valid ? 'ok' : 'error',
    length,
    max,
  };
};

export const buildBaseValidations = (result, rules) => {
  const meta = {
    title: lengthValidation(result.title ?? '', rules.title),
    description: lengthValidation(result.description ?? '', rules.description),
    h1: maxValidation(result.h1 ?? '', rules.h1.max),
  };

  const tokenCounts = countTokens(`${result.title ?? ''} ${result.description ?? ''} ${result.h1 ?? ''}`);
  let maxToken = null;
  let maxCount = 0;
  for (const [token, count] of tokenCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxToken = token;
    }
  }
  const spam = {
    status: maxCount > rules.keywordRepeatMax ? 'warning' : 'ok',
    token: maxToken,
    count: maxCount,
    threshold: rules.keywordRepeatMax,
  };

  return {
    meta,
    duplicates: { status: 'ok', rowIds: [] },
    spam,
  };
};

export const recomputeValidations = (results, projectRulesByProject) => {
  const byProjectLangTitle = new Map();

  for (const result of results) {
    const rules = getRules(projectRulesByProject.get(result.projectId));
    result.validations = buildBaseValidations(result, rules);

    const key = `${result.projectId}::${result.lang}::${(result.title ?? '').trim().toLowerCase()}`;
    if (!byProjectLangTitle.has(key)) byProjectLangTitle.set(key, []);
    byProjectLangTitle.get(key).push(result);
  }

  for (const rows of byProjectLangTitle.values()) {
    if (rows.length < 2) continue;
    const ids = rows.map((r) => r.rowId);
    for (const row of rows) {
      row.validations.duplicates = {
        status: 'warning',
        rowIds: ids,
      };
    }
  }
};

export const detectIssues = (result) => {
  const issues = [];
  if (!result.validations.meta.title.valid) issues.push('meta.title');
  if (!result.validations.meta.description.valid) issues.push('meta.description');
  if (!result.validations.meta.h1.valid) issues.push('meta.h1');
  if (result.validations.duplicates.status === 'warning') issues.push('duplicates');
  if (result.validations.spam.status === 'warning') issues.push('spam');
  return issues;
};

export const aggregateReport = (results) => {
  const issueCounts = new Map();
  const rows = [];

  for (const result of results) {
    const issues = detectIssues(result);
    rows.push({
      rowId: result.rowId,
      projectId: result.projectId,
      lang: result.lang,
      issues,
    });
    for (const issue of issues) {
      issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    }
  }

  const getCount = (issue) => issueCounts.get(issue) ?? 0;

  return {
    totals: {
      rows: results.length,
      meta: {
        title: getCount('meta.title'),
        description: getCount('meta.description'),
        h1: getCount('meta.h1'),
      },
      duplicates: getCount('duplicates'),
      spam: getCount('spam'),
    },
    topIssues: [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ issue, count })),
    rows,
  };
};

export { getRules, DEFAULT_RULES };
