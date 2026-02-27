const historyList = document.getElementById('history');
const diffOutput = document.getElementById('diffOutput');
const rowInput = document.getElementById('rowId');
const langInput = document.getElementById('lang');
const reloadButton = document.getElementById('reload');

let versions = [];
let selectedIds = [];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function computeSimpleLineDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const out = [];

  for (let i = 0; i < max; i += 1) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      out.push(`  ${oldLine ?? ''}`);
      continue;
    }

    if (oldLine !== undefined) {
      out.push(`- ${oldLine}`);
    }

    if (newLine !== undefined) {
      out.push(`+ ${newLine}`);
    }
  }

  return out.join('\n');
}

function renderDiff() {
  if (selectedIds.length !== 2) {
    diffOutput.textContent = 'Select two versions to compare.';
    return;
  }

  const [firstId, secondId] = selectedIds;
  const first = versions.find((v) => v.id === firstId);
  const second = versions.find((v) => v.id === secondId);

  if (!first || !second) {
    diffOutput.textContent = 'Selected versions not found.';
    return;
  }

  const from = first.createdAt <= second.createdAt ? first : second;
  const to = from.id === first.id ? second : first;
  const rawDiff = computeSimpleLineDiff(from.content, to.content);

  const html = escapeHtml(rawDiff)
    .split('\n')
    .map((line) => {
      if (line.startsWith('+')) return `<span class="add">${line}</span>`;
      if (line.startsWith('-')) return `<span class="del">${line}</span>`;
      return line;
    })
    .join('\n');

  diffOutput.innerHTML = html;
}

async function rollback(versionId) {
  const rowId = rowInput.value || '1';
  const lang = langInput.value || 'en';

  const response = await fetch(`/rows/${encodeURIComponent(rowId)}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, versionId, actor: 'ui-user' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    alert(errorData.error || 'Rollback failed');
    return;
  }

  await loadHistory();
}

function renderHistory() {
  historyList.innerHTML = '';

  versions
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((version) => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedIds.includes(version.id);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (selectedIds.length === 2) {
            selectedIds.shift();
          }
          selectedIds.push(version.id);
        } else {
          selectedIds = selectedIds.filter((id) => id !== version.id);
        }
        renderHistory();
        renderDiff();
      });

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `id=${version.id} • ${new Date(version.createdAt).toLocaleString()} • actor=${version.actor}${
        version.rolledBackFrom ? ` • rollback-of=${version.rolledBackFrom}` : ''
      }`;

      const preview = document.createElement('pre');
      preview.textContent = version.content;

      const rollbackBtn = document.createElement('button');
      rollbackBtn.textContent = 'Rollback to this version';
      rollbackBtn.addEventListener('click', () => rollback(version.id));

      li.append(checkbox, meta, preview, rollbackBtn);
      historyList.appendChild(li);
    });
}

async function loadHistory() {
  const rowId = rowInput.value || '1';
  const lang = langInput.value || 'en';
  const response = await fetch(`/rows/${encodeURIComponent(rowId)}/history?lang=${encodeURIComponent(lang)}`);
  const data = await response.json();
  versions = data.generationResults || [];
  selectedIds = [];
  renderHistory();
  renderDiff();
}

reloadButton.addEventListener('click', loadHistory);
loadHistory();
