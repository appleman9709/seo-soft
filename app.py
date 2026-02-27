import json
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

DB_PATH = "data.db"


def utc_now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ImportPreset (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectId INTEGER NOT NULL,
            name TEXT NOT NULL,
            mapping TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            actor TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ImportRun (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectId INTEGER NOT NULL,
            presetId INTEGER,
            fileName TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            actor TEXT NOT NULL,
            stats TEXT NOT NULL,
            FOREIGN KEY (presetId) REFERENCES ImportPreset(id)
        )
        """
    )
    conn.commit()
    conn.close()


INDEX_HTML = """<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Import Presets</title>
  <style>
    body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; }
    textarea, input { width: 100%; margin: .3rem 0 .8rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: .4rem; text-align: left; }
  </style>
</head>
<body>
  <h1>Project Import Manager</h1>
  <p>Project ID: <input id=\"projectId\" type=\"number\" value=\"1\" /></p>

  <div class=\"card\">
    <h2>Current Mapping</h2>
    <label>Actor</label><input id=\"actor\" value=\"demo.user\" />
    <label>Mapping JSON</label><textarea id=\"mapping\" rows=\"5\">{"title":"A","url":"B"}</textarea>
    <label>Preset name</label><input id=\"presetName\" value=\"Default CSV Mapping\" />
    <button onclick=\"savePreset()\">Save mapping as preset</button>
  </div>

  <div class=\"card\">
    <h2>Saved Presets</h2>
    <button onclick=\"loadPresets()\">Refresh Presets</button>
    <ul id=\"presetList\"></ul>
  </div>

  <div class=\"card\">
    <h2>Run Import</h2>
    <label>File name</label><input id=\"fileName\" value=\"products.csv\" />
    <label>Rows imported</label><input id=\"rowsImported\" type=\"number\" value=\"100\" />
    <label>Rows skipped</label><input id=\"rowsSkipped\" type=\"number\" value=\"3\" />
    <label>Warnings</label><input id=\"warnings\" type=\"number\" value=\"1\" />
    <label>Selected preset</label><select id=\"presetSelect\"><option value=\"\">None</option></select>
    <button onclick=\"runImport()\">Import</button>
  </div>

  <div class=\"card\">
    <h2>Recent Import Runs</h2>
    <button onclick=\"loadRuns()\">Refresh Runs</button>
    <table>
      <thead><tr><th>When</th><th>File</th><th>Actor</th><th>Preset</th><th>Imported</th><th>Skipped</th><th>Warnings</th></tr></thead>
      <tbody id=\"runRows\"></tbody>
    </table>
  </div>

<script>
async function req(path, options = {}) {
  const projectId = document.getElementById('projectId').value;
  const res = await fetch(`/projects/${projectId}${path}`, {
    headers: {'Content-Type':'application/json'},
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadPresets() {
  const presets = await req('/import-presets');
  const list = document.getElementById('presetList');
  const select = document.getElementById('presetSelect');
  list.innerHTML = '';
  select.innerHTML = '<option value="">None</option>';
  presets.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} (${p.actor})`;
    li.onclick = () => {
      document.getElementById('mapping').value = JSON.stringify(p.mapping, null, 2);
      select.value = p.id;
    };
    list.appendChild(li);

    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (#${p.id})`;
    select.appendChild(opt);
  });
}

async function savePreset() {
  const payload = {
    name: document.getElementById('presetName').value,
    actor: document.getElementById('actor').value,
    mapping: JSON.parse(document.getElementById('mapping').value)
  };
  await req('/import-presets', {method:'POST', body: JSON.stringify(payload)});
  await loadPresets();
}

async function runImport() {
  const presetIdRaw = document.getElementById('presetSelect').value;
  const payload = {
    actor: document.getElementById('actor').value,
    fileName: document.getElementById('fileName').value,
    stats: {
      rowsImported: Number(document.getElementById('rowsImported').value),
      rowsSkipped: Number(document.getElementById('rowsSkipped').value),
      warnings: Number(document.getElementById('warnings').value),
    }
  };
  if (presetIdRaw) payload.presetId = Number(presetIdRaw);
  await req('/import', {method:'POST', body: JSON.stringify(payload)});
  await loadRuns();
}

async function loadRuns() {
  const runs = await req('/import-runs');
  const tbody = document.getElementById('runRows');
  tbody.innerHTML = '';
  runs.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.createdAt}</td><td>${r.fileName}</td><td>${r.actor}</td><td>${r.presetId || '-'}</td><td>${r.stats.rowsImported || 0}</td><td>${r.stats.rowsSkipped || 0}</td><td>${r.stats.warnings || 0}</td>`;
    tbody.appendChild(tr);
  });
}

loadPresets().then(loadRuns);
</script>
</body>
</html>
"""


class Handler(BaseHTTPRequestHandler):
    def json_response(self, payload, status=HTTPStatus.OK):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def text_response(self, text, status=HTTPStatus.OK, content_type="text/plain"):
        encoded = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def parse_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def route_project(self):
        path = urlparse(self.path).path
        parts = [p for p in path.split("/") if p]
        # /projects/:id/import-presets
        if len(parts) < 3 or parts[0] != "projects":
            return None
        try:
            project_id = int(parts[1])
        except ValueError:
            self.text_response("invalid project id", HTTPStatus.BAD_REQUEST)
            return True
        return project_id, parts[2:]

    def do_GET(self):
        if self.path == "/":
            self.text_response(INDEX_HTML, content_type="text/html")
            return

        routed = self.route_project()
        if not routed:
            self.text_response("not found", HTTPStatus.NOT_FOUND)
            return
        if routed is True:
            return

        project_id, parts = routed
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        if parts == ["import-presets"]:
            rows = conn.execute(
                "SELECT id, name, mapping, createdAt, actor FROM ImportPreset WHERE projectId = ? ORDER BY id DESC",
                (project_id,),
            ).fetchall()
            conn.close()
            self.json_response([
                {
                    "id": r["id"],
                    "name": r["name"],
                    "mapping": json.loads(r["mapping"]),
                    "createdAt": r["createdAt"],
                    "actor": r["actor"],
                }
                for r in rows
            ])
            return

        if parts == ["import-runs"]:
            rows = conn.execute(
                "SELECT id, presetId, fileName, createdAt, actor, stats FROM ImportRun WHERE projectId = ? ORDER BY id DESC LIMIT 50",
                (project_id,),
            ).fetchall()
            conn.close()
            self.json_response([
                {
                    "id": r["id"],
                    "presetId": r["presetId"],
                    "fileName": r["fileName"],
                    "createdAt": r["createdAt"],
                    "actor": r["actor"],
                    "stats": json.loads(r["stats"]),
                }
                for r in rows
            ])
            return

        conn.close()
        self.text_response("not found", HTTPStatus.NOT_FOUND)

    def do_POST(self):
        routed = self.route_project()
        if not routed:
            self.text_response("not found", HTTPStatus.NOT_FOUND)
            return
        if routed is True:
            return

        project_id, parts = routed
        body = self.parse_body()
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        if parts == ["import-presets"]:
            for req in ["name", "mapping", "actor"]:
                if req not in body:
                    conn.close()
                    self.text_response(f"missing field: {req}", HTTPStatus.BAD_REQUEST)
                    return
            cur = conn.execute(
                "INSERT INTO ImportPreset (projectId, name, mapping, createdAt, actor) VALUES (?, ?, ?, ?, ?)",
                (project_id, body["name"], json.dumps(body["mapping"]), utc_now_iso(), body["actor"]),
            )
            conn.commit()
            new_id = cur.lastrowid
            row = conn.execute(
                "SELECT id, name, mapping, createdAt, actor FROM ImportPreset WHERE id = ?",
                (new_id,),
            ).fetchone()
            conn.close()
            self.json_response(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "mapping": json.loads(row["mapping"]),
                    "createdAt": row["createdAt"],
                    "actor": row["actor"],
                },
                status=HTTPStatus.CREATED,
            )
            return

        if parts == ["import"]:
            for req in ["fileName", "actor", "stats"]:
                if req not in body:
                    conn.close()
                    self.text_response(f"missing field: {req}", HTTPStatus.BAD_REQUEST)
                    return
            preset_id = body.get("presetId")
            if preset_id is not None:
                found = conn.execute(
                    "SELECT 1 FROM ImportPreset WHERE id = ? AND projectId = ?",
                    (preset_id, project_id),
                ).fetchone()
                if not found:
                    conn.close()
                    self.text_response("invalid presetId", HTTPStatus.BAD_REQUEST)
                    return

            cur = conn.execute(
                "INSERT INTO ImportRun (projectId, presetId, fileName, createdAt, actor, stats) VALUES (?, ?, ?, ?, ?, ?)",
                (project_id, preset_id, body["fileName"], utc_now_iso(), body["actor"], json.dumps(body["stats"])),
            )
            conn.commit()
            run_id = cur.lastrowid
            row = conn.execute(
                "SELECT id, presetId, fileName, createdAt, actor, stats FROM ImportRun WHERE id = ?",
                (run_id,),
            ).fetchone()
            conn.close()
            self.json_response(
                {
                    "id": row["id"],
                    "presetId": row["presetId"],
                    "fileName": row["fileName"],
                    "createdAt": row["createdAt"],
                    "actor": row["actor"],
                    "stats": json.loads(row["stats"]),
                },
                status=HTTPStatus.CREATED,
            )
            return

        conn.close()
        self.text_response("not found", HTTPStatus.NOT_FOUND)


def run_server(port=8000):
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Server listening on http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
