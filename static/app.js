const baseColumns = [
  "url",
  "entityType",
  "status",
  "meta_status",
  "schema_status",
  "title_ru",
  "desc_ru",
  "h1_ru",
];
const kkColumns = ["title_kk", "desc_kk", "h1_kk"];
const enColumns = ["title_en", "desc_en", "h1_en"];

const state = {
  rows: [],
  selected: new Set(),
  activeRowId: null,
  showKk: false,
  showEn: false,
};

const tableHead = document.querySelector("#grid thead");
const tableBody = document.querySelector("#grid tbody");
const drawer = document.getElementById("drawer");
const bulkBar = document.getElementById("bulk-bar");

function visibleColumns() {
  return [
    ...baseColumns,
    ...(state.showKk ? kkColumns : []),
    ...(state.showEn ? enColumns : []),
  ];
}

async function fetchRows() {
  const res = await fetch("/api/rows");
  const data = await res.json();
  state.rows = data.rows;
  render();
}

function render() {
  const cols = visibleColumns();
  tableHead.innerHTML = `<tr><th><input type="checkbox" id="select-all"></th>${cols
    .map((c) => `<th>${c}</th>`)
    .join("")}</tr>`;

  tableBody.innerHTML = state.rows
    .map((row) => {
      const cells = cols
        .map(
          (key) =>
            `<td><div class="cell-edit" contenteditable="true" data-id="${row.id}" data-field="${key}">${escapeHtml(
              String(row[key] ?? "")
            )}</div></td>`
        )
        .join("");
      return `<tr data-row="${row.id}"><td><input type="checkbox" class="row-select" data-id="${row.id}" ${
        state.selected.has(row.id) ? "checked" : ""
      }></td>${cells}</tr>`;
    })
    .join("");

  updateBulkBar();
  attachHandlers();
  renderDrawer();
}

function attachHandlers() {
  document.querySelectorAll(".cell-edit").forEach((el) => {
    el.addEventListener("blur", onCellBlur);
    el.addEventListener("click", () => {
      state.activeRowId = Number(el.dataset.id);
      drawer.classList.remove("hidden");
      renderDrawer();
    });
  });

  document.querySelectorAll(".row-select").forEach((box) => {
    box.addEventListener("change", () => {
      const id = Number(box.dataset.id);
      if (box.checked) state.selected.add(id);
      else state.selected.delete(id);
      updateBulkBar();
    });
  });

  const all = document.getElementById("select-all");
  all.checked = state.rows.length > 0 && state.selected.size === state.rows.length;
  all.addEventListener("change", () => {
    if (all.checked) state.rows.forEach((row) => state.selected.add(row.id));
    else state.selected.clear();
    render();
  });
}

function updateBulkBar() {
  const count = state.selected.size;
  document.getElementById("bulk-count").textContent = `${count} selected`;
  bulkBar.classList.toggle("hidden", count === 0);
}

async function onCellBlur(event) {
  const id = Number(event.target.dataset.id);
  const field = event.target.dataset.field;
  const value = event.target.textContent.trim();
  const current = state.rows.find((r) => r.id === id);
  if (!current || String(current[field] ?? "") === value) return;

  const res = await fetch(`/api/rows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value }),
  });
  const payload = await res.json();
  if (payload.row) {
    const idx = state.rows.findIndex((r) => r.id === id);
    state.rows[idx] = payload.row;
    if (state.activeRowId === id) renderDrawer();
  }
}

function renderDrawer() {
  const row = state.rows.find((item) => item.id === state.activeRowId);
  if (!row) {
    drawer.classList.add("hidden");
    return;
  }

  document.getElementById("snippet").innerHTML = `
    <div class="title">${escapeHtml(row.title_ru || "")}</div>
    <div class="url">${escapeHtml(row.url || "")}</div>
    <div class="desc">${escapeHtml(row.desc_ru || "")}</div>`;
  document.getElementById("jsonld").textContent = JSON.stringify(row.jsonLd || {}, null, 2);
  document.getElementById("validations").innerHTML = (row.validations || [])
    .map(
      (item) =>
        `<li class="status-${item.status}"><strong>${item.name}:</strong> ${item.details}</li>`
    )
    .join("");
  document.getElementById("history").innerHTML = (row.version_history || [])
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("toggle-kk").addEventListener("change", (event) => {
  state.showKk = event.target.checked;
  render();
});
document.getElementById("toggle-en").addEventListener("change", (event) => {
  state.showEn = event.target.checked;
  render();
});
document.getElementById("close-drawer").addEventListener("click", () => {
  state.activeRowId = null;
  drawer.classList.add("hidden");
});

bulkBar.addEventListener("click", async (event) => {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const action = event.target.dataset.action;
  if (action === "clear") {
    state.selected.clear();
    render();
    return;
  }

  const next = action === "publish" ? "published" : "draft";
  const ids = [...state.selected];
  for (const id of ids) {
    await fetch(`/api/rows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "status", value: next }),
    });
  }
  await fetchRows();
});

fetchRows();
