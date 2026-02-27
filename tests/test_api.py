import json
import os
import tempfile
import threading
import time
import unittest
from urllib.request import Request, urlopen

import app


def req(method, path, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(f"http://127.0.0.1:8123{path}", data=data, headers=headers, method=method)
    with urlopen(request) as res:
        return res.status, json.loads(res.read().decode("utf-8"))


class ImportApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        app.DB_PATH = os.path.join(cls.tmp.name, "test.db")
        app.init_db()
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 8123), app.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=1)
        cls.tmp.cleanup()

    def test_preset_and_run_flow(self):
        status, preset = req("POST", "/projects/7/import-presets", {
            "name": "My Preset",
            "mapping": {"name": "col1", "url": "col2"},
            "actor": "alice"
        })
        self.assertEqual(status, 201)
        self.assertEqual(preset["name"], "My Preset")

        status, presets = req("GET", "/projects/7/import-presets")
        self.assertEqual(status, 200)
        self.assertEqual(len(presets), 1)

        status, run = req("POST", "/projects/7/import", {
            "presetId": preset["id"],
            "fileName": "file.csv",
            "actor": "alice",
            "stats": {"rowsImported": 10, "rowsSkipped": 1, "warnings": 2}
        })
        self.assertEqual(status, 201)
        self.assertEqual(run["stats"]["warnings"], 2)

        status, runs = req("GET", "/projects/7/import-runs")
        self.assertEqual(status, 200)
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0]["presetId"], preset["id"])


if __name__ == "__main__":
    unittest.main()
