from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
STATIC_DIR = ROOT / "static"

ROWS = [
    {
        "id": 1,
        "url": "https://example.kz/catalog/smartphones",
        "entityType": "Category",
        "status": "draft",
        "meta_status": "warning",
        "schema_status": "ok",
        "title_ru": "Смартфоны в Казахстане — купить онлайн",
        "desc_ru": "Большой выбор смартфонов с доставкой по Казахстану.",
        "h1_ru": "Смартфоны",
        "title_kk": "Қазақстандағы смартфондар — онлайн сатып алу",
        "desc_kk": "Қазақстан бойынша жеткізумен смартфондардың үлкен таңдауы.",
        "h1_kk": "Смартфондар",
        "title_en": "Smartphones in Kazakhstan — Buy Online",
        "desc_en": "Wide selection of smartphones with delivery across Kazakhstan.",
        "h1_en": "Smartphones",
        "jsonLd": {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Смартфоны",
            "url": "https://example.kz/catalog/smartphones"
        },
        "version_history": [
            "v5: title_ru updated by Ana at 09:15",
            "v4: schema refreshed",
            "v3: desc_ru shortened"
        ],
    },
    {
        "id": 2,
        "url": "https://example.kz/product/iphone-15",
        "entityType": "Product",
        "status": "published",
        "meta_status": "ok",
        "schema_status": "warning",
        "title_ru": "iPhone 15 128GB — цена и характеристики",
        "desc_ru": "Официальная гарантия, доставка за 1 день.",
        "h1_ru": "Apple iPhone 15",
        "title_kk": "iPhone 15 128GB — баға және сипаттамалар",
        "desc_kk": "Ресми кепілдік, 1 күнде жеткізу.",
        "h1_kk": "Apple iPhone 15",
        "title_en": "iPhone 15 128GB — Price & Specs",
        "desc_en": "Official warranty, 1-day delivery.",
        "h1_en": "Apple iPhone 15",
        "jsonLd": {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Apple iPhone 15",
            "sku": "APL-IP15-128"
        },
        "version_history": [
            "v8: status published",
            "v7: title_kk adjusted",
            "v6: schema warning introduced"
        ],
    },
]


EDITABLE = {
    "url",
    "entityType",
    "status",
    "meta_status",
    "schema_status",
    "title_ru",
    "desc_ru",
    "h1_ru",
    "title_kk",
    "desc_kk",
    "h1_kk",
    "title_en",
    "desc_en",
    "h1_en",
}


def compute_validations(row):
    validations = []
    title = row.get("title_ru", "")
    desc = row.get("desc_ru", "")
    schema_ok = row.get("schema_status") == "ok"

    validations.append(
        {
            "name": "Title length",
            "status": "ok" if 30 <= len(title) <= 65 else "warning",
            "details": f"{len(title)} chars (recommended 30-65)",
        }
    )
    validations.append(
        {
            "name": "Description length",
            "status": "ok" if 90 <= len(desc) <= 160 else "warning",
            "details": f"{len(desc)} chars (recommended 90-160)",
        }
    )
    validations.append(
        {
            "name": "Schema completeness",
            "status": "ok" if schema_ok else "warning",
            "details": "Schema status is synchronized with validator",
        }
    )
    return validations


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, code=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_file(self, path: Path):
        if not path.exists() or not path.is_file():
            self.send_error(404, "Not found")
            return
        content = path.read_bytes()
        ctype = "text/plain; charset=utf-8"
        if path.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif path.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif path.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/rows":
            for row in ROWS:
                row["validations"] = compute_validations(row)
            self._send_json({"rows": ROWS})
            return

        if parsed.path in {"/", "/table"}:
            self._send_file(STATIC_DIR / "index.html")
            return

        candidate = (STATIC_DIR / parsed.path.lstrip("/")).resolve()
        if STATIC_DIR.resolve() in candidate.parents:
            self._send_file(candidate)
            return

        self.send_error(404, "Not found")

    def do_PATCH(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/rows/"):
            self.send_error(404, "Not found")
            return

        try:
            row_id = int(parsed.path.rsplit("/", 1)[-1])
        except ValueError:
            self.send_error(400, "Invalid row id")
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        payload = json.loads(body or b"{}")
        field = payload.get("field")
        value = payload.get("value")

        if field not in EDITABLE:
            self._send_json({"error": "Field is not editable"}, 400)
            return

        row = next((item for item in ROWS if item["id"] == row_id), None)
        if row is None:
            self._send_json({"error": "Row not found"}, 404)
            return

        row[field] = value
        row.setdefault("version_history", []).insert(0, f"edit: {field} updated")
        row["validations"] = compute_validations(row)
        self._send_json({"row": row})


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8000), Handler)
    print("Serving on http://0.0.0.0:8000")
    server.serve_forever()
