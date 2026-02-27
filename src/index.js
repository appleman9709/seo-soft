import http from 'node:http';
import { aggregateReport, detectIssues, recomputeValidations } from './validation.js';

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
};

export const createServer = () => {
  const results = [];
  const rulesByProject = new Map();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'POST' && /^\/projects\/[^/]+\/rules$/.test(url.pathname)) {
      const [, , projectId] = url.pathname.split('/');
      const body = await parseBody(req);
      rulesByProject.set(projectId, body ?? {});
      recomputeValidations(results, rulesByProject);
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && url.pathname === '/generation-results') {
      const payload = await parseBody(req);
      if (!payload.projectId || !payload.rowId || !payload.lang) {
        sendJson(res, 400, { error: 'projectId, rowId and lang are required' });
        return;
      }

      const existingIndex = results.findIndex(
        (r) => r.projectId === payload.projectId && r.rowId === payload.rowId && r.lang === payload.lang,
      );

      const next = {
        projectId: payload.projectId,
        rowId: payload.rowId,
        lang: payload.lang,
        title: payload.title ?? '',
        description: payload.description ?? '',
        h1: payload.h1 ?? '',
        validations: {},
      };

      if (existingIndex >= 0) results.splice(existingIndex, 1, next);
      else results.push(next);

      recomputeValidations(results, rulesByProject);
      sendJson(res, 201, next);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/generation-results') {
      const issue = url.searchParams.get('issue');
      const filtered = issue ? results.filter((row) => detectIssues(row).includes(issue)) : results;
      sendJson(res, 200, filtered);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/report') {
      const issue = url.searchParams.get('issue');
      const report = aggregateReport(results);
      if (issue) report.rows = report.rows.filter((row) => row.issues.includes(issue));
      sendJson(res, 200, report);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  return server;
};

