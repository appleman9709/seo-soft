const projectId = "1";

const templatesContainer = document.getElementById("templates");
const resultsBody = document.getElementById("resultsBody");
const progressNode = document.getElementById("progress");
const startButton = document.getElementById("startBtn");

async function fetchJSON(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error || "Request failed");
  }

  return response.json();
}

function selectedLanguages() {
  return [...document.querySelectorAll(".lang:checked")].map((node) => node.value);
}

function selectedTemplates() {
  return [...document.querySelectorAll(".template:checked")].map((node) => node.value);
}

function getFilter() {
  const status = document.getElementById("statusFilter").value;
  const entityType = document.getElementById("entityFilter").value;
  return {
    ...(status ? { status } : {}),
    ...(entityType ? { entityType } : {})
  };
}

async function loadTemplates() {
  const data = await fetchJSON("/templates");
  templatesContainer.innerHTML = data.templates
    .map(
      (template) =>
        `<label><input type="checkbox" class="template" value="${template.id}" checked /> ${template.name} (${template.type})</label><br/>`
    )
    .join("\n");
}

function renderResults(results) {
  resultsBody.innerHTML = results
    .slice(-100)
    .reverse()
    .map((result) => {
      const validation = JSON.stringify(result.validations);
      return `<tr>
        <td>${result.rowId}</td>
        <td>${result.language}</td>
        <td>${result.version}</td>
        <td>${result.renderedFields.title || ""}</td>
        <td>${result.renderedFields.description || ""}</td>
        <td><pre>${validation}</pre></td>
      </tr>`;
    })
    .join("\n");
}

async function refreshResults() {
  const data = await fetchJSON(`/projects/${projectId}/results`);
  renderResults(data.results);
}

async function pollJob(jobId) {
  while (true) {
    const job = await fetchJSON(`/jobs/${jobId}`);
    progressNode.textContent = `Processed ${job.processedRows}/${job.totalRows} rows, created ${job.createdCount} results`;
    if (job.status === "completed") {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function startGeneration() {
  startButton.disabled = true;
  try {
    const languages = selectedLanguages();
    if (!languages.length) {
      throw new Error("Select at least one language");
    }

    const templateIds = selectedTemplates();
    const filter = getFilter();

    let cursor = null;
    let done = false;
    while (!done) {
      const response = await fetchJSON(`/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter,
          languages,
          templateIds,
          cursor,
          batchSize: 100
        })
      });

      await pollJob(response.jobId);
      cursor = response.nextCursor;
      done = cursor === null;
      await refreshResults();
    }

    progressNode.textContent = "Generation completed";
  } catch (error) {
    progressNode.textContent = `Error: ${error.message}`;
  } finally {
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", startGeneration);

await loadTemplates();
await refreshResults();
