const tableBody = document.querySelector('#templatesTable tbody');
const refreshBtn = document.querySelector('#refreshBtn');
const createBtn = document.querySelector('#createBtn');

async function loadPlaceholders() {
  const res = await fetch('/api/placeholders');
  const data = await res.json();
  const helper = document.querySelector('#placeholderHelper');
  helper.innerHTML = `Allowed placeholders: ${data.placeholders.map((item) => `<code>{${item}}</code>`).join(' ')}`;
}

function filters() {
  return {
    projectId: document.querySelector('#projectId').value,
    kind: document.querySelector('#kindFilter').value,
    entityType: document.querySelector('#entityTypeFilter').value,
    lang: document.querySelector('#langFilter').value
  };
}

function queryStringFromFilters(current) {
  const params = new URLSearchParams();
  if (current.kind) params.set('kind', current.kind);
  if (current.entityType) params.set('entityType', current.entityType);
  if (current.lang) params.set('lang', current.lang);
  return params.toString();
}

async function fetchTemplates() {
  const current = filters();
  const qs = queryStringFromFilters(current);
  const res = await fetch(`/projects/${current.projectId}/templates${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  return data.templates;
}

async function refreshList() {
  const templates = await fetchTemplates();
  tableBody.innerHTML = '';

  for (const template of templates) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${template.id}</td>
      <td>${template.rootId}</td>
      <td>${template.version}</td>
      <td>${template.kind}/${template.entityType}/${template.lang ?? '-'}</td>
      <td>${template.isDefault ? '✅' : ''}</td>
      <td><code>${template.body}</code></td>
      <td>
        <button data-action="clone" data-id="${template.id}">Clone</button>
        <button data-action="edit" data-id="${template.id}">New Version</button>
        <button data-action="default" data-id="${template.id}">Set default</button>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

async function createTemplate() {
  const payload = {
    kind: document.querySelector('#kindInput').value,
    entityType: document.querySelector('#entityTypeInput').value,
    lang: document.querySelector('#langInput').value,
    body: document.querySelector('#templateBody').value
  };

  const projectId = document.querySelector('#projectId').value;
  const res = await fetch(`/projects/${projectId}/templates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.json();
    alert(error.error);
    return;
  }

  await refreshList();
}

async function handleRowAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const templateId = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === 'clone') {
    await fetch(`/templates/${templateId}/clone`, { method: 'POST' });
  }

  if (action === 'edit') {
    const body = prompt('Enter body for a new version:');
    if (!body) return;
    await fetch(`/templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body })
    });
  }

  if (action === 'default') {
    await fetch(`/templates/${templateId}/set-default`, { method: 'POST' });
  }

  await refreshList();
}

refreshBtn.addEventListener('click', refreshList);
createBtn.addEventListener('click', createTemplate);
tableBody.addEventListener('click', handleRowAction);

await loadPlaceholders();
await refreshList();
