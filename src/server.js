import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProject, store } from "./data.js";
import { enqueueGeneration, getJob } from "./generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendNotFound(res) {
  json(res, 404, { error: "Not Found" });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let filePath = url.pathname;
  if (filePath === "/" || filePath === "/generate") {
    filePath = "/generate.html";
  }

  const absolutePath = path.join(publicDir, filePath);
  if (!absolutePath.startsWith(publicDir)) {
    return sendNotFound(res);
  }

  try {
    const content = await readFile(absolutePath);
    const ext = path.extname(absolutePath);
    const type =
      ext === ".html"
        ? "text/html"
        : ext === ".js"
          ? "text/javascript"
          : "text/plain";

    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    sendNotFound(res);
  }
}

function handleGetRows(projectId, res) {
  const project = getProject(projectId);
  if (!project) {
    return json(res, 404, { error: "Project not found" });
  }

  return json(res, 200, { rows: project.rows });
}

function handleGetTemplates(res) {
  return json(res, 200, { templates: store.templates });
}

function handleGetResults(projectId, res) {
  const rowsMap = new Map((getProject(projectId)?.rows || []).map((row) => [row.id, row]));
  const results = store.generationResults
    .filter((result) => result.projectId === projectId)
    .map((result) => ({
      ...result,
      row: rowsMap.get(result.rowId)
    }));

  return json(res, 200, { results });
}

async function handlePostGenerate(projectId, req, res) {
  const project = getProject(projectId);
  if (!project) {
    return json(res, 404, { error: "Project not found" });
  }

  try {
    const payload = await parseJsonBody(req);
    if (!Array.isArray(payload.languages) || payload.languages.length === 0) {
      return json(res, 400, { error: "languages[] is required" });
    }

    if (!payload.rowIds && !payload.filter) {
      return json(res, 400, { error: "rowIds or filter is required" });
    }

    const response = enqueueGeneration(project, payload);
    return json(res, 200, response);
  } catch (error) {
    return json(res, 400, { error: `Invalid JSON: ${error.message}` });
  }
}

function handleGetJob(jobId, res) {
  const job = getJob(jobId);
  if (!job) {
    return json(res, 404, { error: "Job not found" });
  }

  return json(res, 200, {
    id: job.id,
    status: job.status,
    cursor: job.cursor,
    nextCursor: job.status === "completed" ? null : String(job.cursor),
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    batchSize: job.batchSize,
    createdCount: job.createdCount
  });
}

const server = createServer(async (req, res) => {
  const { method, url } = req;
  if (!url) {
    return sendNotFound(res);
  }

  const generateMatch = url.match(/^\/projects\/([^/]+)\/generate$/);
  const rowsMatch = url.match(/^\/projects\/([^/]+)\/rows$/);
  const resultsMatch = url.match(/^\/projects\/([^/]+)\/results$/);
  const jobMatch = url.match(/^\/jobs\/([^/]+)$/);

  if (method === "POST" && generateMatch) {
    return handlePostGenerate(generateMatch[1], req, res);
  }

  if (method === "GET" && rowsMatch) {
    return handleGetRows(rowsMatch[1], res);
  }

  if (method === "GET" && resultsMatch) {
    return handleGetResults(resultsMatch[1], res);
  }

  if (method === "GET" && url === "/templates") {
    return handleGetTemplates(res);
  }

  if (method === "GET" && jobMatch) {
    return handleGetJob(jobMatch[1], res);
  }

  if (method === "GET") {
    return serveStatic(req, res);
  }

  return sendNotFound(res);
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://0.0.0.0:${port}`);
});
