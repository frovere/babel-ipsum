"""Acquisition must verify committed pins before rehydrating a missing cache."""

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


multilingual = load("acquisition_multilingual", "import-multilingual.py")
ar_russian = load("acquisition_ar_russian", "multilingual_ar_russian.py")
western = load("acquisition_western", "import-western.py")


def response(raw):
    result = io.BytesIO(raw)
    result.url = "https://example.org/redirected"
    result.headers = Mock()
    result.headers.get_content_charset.return_value = "utf-8"
    return result


class SnapshotAcquisitionTests(unittest.TestCase):
    def test_multilingual_rehydration_preserves_both_ledger_formats(self):
        pinned = b"Original source"
        url = "https://example.org/source"
        for structured in (False, True):
            for changed in (False, True):
                with self.subTest(structured=structured, changed=changed), \
                     tempfile.TemporaryDirectory() as directory, \
                     patch.object(multilingual, "ROOT", Path(directory)):
                    snapshots = multilingual.Snapshots("fixture", fetch=True)
                    snapshots.path.parent.mkdir(parents=True)
                    record = {"sourceUrl": url, "responseUrl": "https://example.org/original",
                              "encoding": "utf-8", "retrievedOn": "2020-01-02"}
                    if structured:
                        record.update(snapshotPath=".cache/corpus/sources/fixture/source.html",
                                      snapshotSha256=hashlib.sha256(pinned).hexdigest())
                        ledger = {"snapshots": [record], "historicalEvidence": True}
                    else:
                        record["sha256"] = hashlib.sha256(pinned).hexdigest()
                        ledger = {"source.html": record}
                    snapshots.path.write_text(json.dumps(ledger))
                    snapshots = multilingual.Snapshots("fixture", fetch=True)
                    before = snapshots.path.read_bytes()
                    raw = b"Changed upstream" if changed else pinned
                    with patch.object(multilingual, "urlopen", return_value=response(raw)) as download, \
                         patch.object(multilingual.time, "sleep"):
                        if changed:
                            with self.assertRaisesRegex(ValueError, "--fetch cannot replace a recorded pin"):
                                snapshots.get("source.html", url)
                            self.assertFalse(snapshots.directory.exists())
                        else:
                            self.assertEqual(snapshots.get("source.html", url)[0], pinned.decode())
                            self.assertEqual((snapshots.directory / "source.html").read_bytes(), pinned)
                        download.assert_called_once()
                    self.assertEqual(snapshots.path.read_bytes(), before)
                    self.assertEqual(snapshots.ledger, ledger)

    def test_ar_russian_rehydration_verifies_urllib_and_firecrawl_downloads(self):
        pinned = b"Original source"
        for firecrawl in (False, True):
            for changed in (False, True):
                with self.subTest(firecrawl=firecrawl, changed=changed), \
                     tempfile.TemporaryDirectory() as directory, \
                     patch.object(ar_russian.COMMON, "ROOT", Path(directory)):
                    url = "https://www.safahat.org/source" if firecrawl else "https://example.org/source"
                    snapshots = ar_russian.COMMON.Snapshots("fixture")
                    snapshots.record("source.html", {
                        "sourceUrl": url, "responseUrl": None, "encoding": "utf-8",
                        "retrievedOn": "2020-01-02", "sha256": hashlib.sha256(pinned).hexdigest(),
                    })
                    before = snapshots.path.read_bytes()
                    path = snapshots.directory / "source.html"
                    raw = b"Changed upstream" if changed else pinned
                    payload = json.dumps({"data": {"rawHtml": raw.decode()}}).encode() if firecrawl else raw
                    with patch.dict(ar_russian.os.environ, {"FIRECRAWL_API_KEY": "test-key" if firecrawl else ""}), \
                         patch.object(ar_russian.urllib.request, "urlopen", return_value=response(payload)) as download, \
                         patch.object(ar_russian.time, "sleep"):
                        if changed:
                            with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                                ar_russian.acquire(url, path, True)
                            self.assertFalse(path.parent.exists())
                        else:
                            self.assertEqual(ar_russian.acquire(url, path, True), pinned)
                            self.assertEqual(path.read_bytes(), pinned)
                        download.assert_called_once()
                    self.assertEqual(snapshots.path.read_bytes(), before)

    def test_western_rehydration_requires_explicit_refresh_to_change_pin(self):
        pinned = b"Original source"
        url = "https://example.org/source"
        for refresh, cached, raw in ((False, False, pinned), (False, False, b"Changed upstream"),
                                     (True, False, b"Changed upstream"), (True, True, b"Changed upstream")):
            with self.subTest(refresh=refresh, cached=cached, raw=raw), \
                 tempfile.TemporaryDirectory() as directory, \
                 patch.object(western, "ROOT", Path(directory)):
                root = Path(directory)
                path = root / ".cache/corpus/sources/fixture/source.html"
                path.parent.mkdir(parents=True)
                sibling = path.parent / "untouched.html"
                sibling.write_bytes(b"Other cached source")
                if cached:
                    path.write_bytes(pinned)
                provenance = root / "corpus/provenance/fixture.json"
                provenance.parent.mkdir(parents=True)
                record = {"sourceUrl": url, "retrievedOn": "2020-01-02",
                          "snapshotSha256": hashlib.sha256(pinned).hexdigest(), "historicalEvidence": True}
                provenance.write_text(json.dumps({"schemaVersion": 1, "sources": {
                    "source.html": record, "untouched.html": {"historicalEvidence": True}}}))
                before = provenance.read_bytes()
                args = types.SimpleNamespace(offline=False, check=False, refresh=refresh)
                with patch.object(western.urllib.request, "urlopen", return_value=response(raw)) as download, \
                     patch.object(western.time, "sleep"):
                    if not refresh and raw != pinned:
                        with self.assertRaisesRegex(ValueError, "use --refresh"):
                            western.acquire("fixture", "source", url, args)
                        self.assertFalse(path.exists())
                    else:
                        self.assertEqual(western.acquire("fixture", "source", url, args), (path, raw))
                        self.assertEqual(path.read_bytes(), raw)
                    download.assert_called_once()
                if refresh:
                    records = json.loads(provenance.read_text())["sources"]
                    self.assertEqual(records["source.html"]["snapshotSha256"], hashlib.sha256(raw).hexdigest())
                    self.assertEqual(records["untouched.html"], {"historicalEvidence": True})
                else:
                    self.assertEqual(provenance.read_bytes(), before)
                self.assertEqual(sibling.read_bytes(), b"Other cached source")


if __name__ == "__main__":
    unittest.main()
