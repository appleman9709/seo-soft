let lastRequest = null;

const previewEl = document.getElementById('preview');
const statusEl = document.getElementById('status');

for (const btn of document.querySelectorAll('[data-modal]')) {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).showModal());
}

for (const form of document.querySelectorAll('.modal-form')) {
  form.addEventListener('close', () => form.reset());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const operation = form.dataset.operation;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    if ('fields' in payload && operation !== 'applyTemplate') {
      payload.fields = payload.fields.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (operation === 'prefixSuffix' && !payload.scope) {
      delete payload.scope;
    }

    lastRequest = { operation, payload, dryRun: true };

    const response = await fetch('/rows/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastRequest),
    });

    const body = await response.json();
    if (!response.ok) {
      statusEl.textContent = body.error;
      return;
    }

    previewEl.textContent = JSON.stringify(body.preview, null, 2);
    statusEl.textContent = `Preview generated: ${body.changedCount} change(s)`;
    form.closest('dialog').close();
  });
}

document.getElementById('apply').addEventListener('click', async () => {
  if (!lastRequest) {
    statusEl.textContent = 'Create a preview first.';
    return;
  }

  const request = { ...lastRequest, dryRun: false };
  const response = await fetch('/rows/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = await response.json();
  if (!response.ok) {
    statusEl.textContent = body.error;
    return;
  }

  statusEl.textContent = `Applied ${body.changedCount} change(s). Audit log and version history updated.`;
});
