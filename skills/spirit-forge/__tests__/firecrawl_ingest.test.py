#!/usr/bin/env python3
"""Test Firecrawl JSON ingest: correctly merges structured extraction output."""

import sys, json, tempfile, os
from pathlib import Path
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))


def test_ingest_gotchas():
    """firecrawl-gotchas.json is correctly ingested."""
    from scripts.distill import _ingest_firecrawl_json
    with tempfile.TemporaryDirectory() as tmp:
        raw_dir = Path(tmp)
        # Write a mock firecrawl-gotchas.json
        gotchas = {
            "gotchas": [
                {"pattern": "Don't mutate state directly", "fix": "Use setState"},
                {"pattern": "Always cleanup effects", "fix": "Return cleanup function"},
            ]
        }
        with open(raw_dir / "firecrawl-gotchas.json", "w") as f:
            json.dump(gotchas, f)

        result = _ingest_firecrawl_json(str(raw_dir))
        assert "gotchas" in result
        assert len(result["gotchas"]) == 2
        assert result["gotchas"][0]["pattern"] == "Don't mutate state directly"
        print("  PASS: ingested 2 gotchas from firecrawl-gotchas.json")


def test_no_file_no_ingest():
    """No crash when firecrawl JSON files don't exist."""
    from scripts.distill import _ingest_firecrawl_json
    with tempfile.TemporaryDirectory() as tmp:
        result = _ingest_firecrawl_json(str(tmp))
        assert result == {}
        print("  PASS: empty result when no firecrawl files present")


def test_ingest_heuristics():
    """firecrawl-heuristics.json is correctly ingested."""
    from scripts.distill import _ingest_firecrawl_json
    with tempfile.TemporaryDirectory() as tmp:
        raw_dir = Path(tmp)
        heuristics = {
            "heuristics": [
                {"when": "state depends on previous state", "then": "use functional updater", "because": "avoids stale closures"},
            ]
        }
        with open(raw_dir / "firecrawl-heuristics.json", "w") as f:
            json.dump(heuristics, f)

        result = _ingest_firecrawl_json(str(raw_dir))
        assert "heuristics" in result
        assert len(result["heuristics"]) == 1
        print("  PASS: ingested 1 heuristic from firecrawl-heuristics.json")


if __name__ == "__main__":
    print("Testing Firecrawl JSON ingest...")
    test_ingest_gotchas()
    test_no_file_no_ingest()
    test_ingest_heuristics()
    print("Done.")
