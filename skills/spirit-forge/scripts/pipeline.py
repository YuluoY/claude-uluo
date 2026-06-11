#!/usr/bin/env python3
"""
Spirit Forge — Unified Pipeline (拘灵遣将)

Runs the complete Capture → Distill → Forge → Validate pipeline
in a single command with quality gates between each phase.

Usage:
    python pipeline.py <target> [--depth L1|L2|L3] [--skill-name <name>]
    python pipeline.py gaearon --depth L2
    python pipeline.py "Dan Abramov, React" --depth L3 --skill-name dan-abramov

Options:
    --depth           Research depth (default: L2)
    --skill-name      Override auto-derived skill identifier
    --output-dir      Base output directory (default: .spirit-forge/<slug>/)
    --stop-on-gate    Halt pipeline if a quality gate fails (default: continue with warning)
"""

import argparse
import sys
import time
from pathlib import Path

_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))

from scripts.capture import capture as do_capture
from scripts.distill import distill as do_distill
from scripts.forge import forge as do_forge
from scripts.validate import validate as do_validate


QUALITY_GATE_FAILED = 2  # Exit code for quality gate failure


def pipeline(
    target: str,
    depth: str = "L2",
    skill_name: str = "",
    output_dir: str = "",
    stop_on_gate: bool = False,
) -> dict:
    """Run the complete Spirit Forge pipeline.

    Returns a summary dict suitable for eval_metadata.json.
    """
    if not output_dir:
        slug = target.lower().replace(" ", "-").replace("@", "").replace("/", "-")[:30]
        output_dir = f".spirit-forge/{slug}"

    base = Path(output_dir)
    raw_dir = base / "raw-research"
    profile_path = base / "persona-profile.json"
    skill_dir = base / "generated-skill"

    phases = {}
    t0 = time.time()

    # ---- Phase 1: Capture ----
    print(f"\n{'#'*60}")
    print(f"#  Phase 1/4: Capture (拘灵)")
    print(f"{'#'*60}")
    try:
        meta = do_capture(target, depth, str(raw_dir))
        phases["capture"] = {"status": "ok", "meta": meta}
        if meta.get("capture_status") == "failed":
            phases["capture"]["status"] = "gate_failed"
            if stop_on_gate:
                print("Pipeline halted: capture quality gate failed.")
                return _summary(target, depth, skill_name, phases, t0, failed=True)
    except Exception as e:
        phases["capture"] = {"status": "error", "error": str(e)}
        print(f"  ✗ Capture failed: {e}")
        return _summary(target, depth, skill_name, phases, t0, failed=True)

    # ---- Phase 2: Distill ----
    print(f"\n{'#'*60}")
    print(f"#  Phase 2/4: Distill (炼)")
    print(f"{'#'*60}")
    try:
        profile = do_distill(str(raw_dir), str(profile_path))
        phases["distill"] = {"status": "ok", "profile": profile}
        if profile.get("_quality_gate", {}).get("status") == "insufficient":
            phases["distill"]["status"] = "gate_failed"
            if stop_on_gate:
                print("Pipeline halted: distill quality gate failed.")
                return _summary(target, depth, skill_name, phases, t0, failed=True)
    except Exception as e:
        phases["distill"] = {"status": "error", "error": str(e)}
        print(f"  ✗ Distill failed: {e}")
        return _summary(target, depth, skill_name, phases, t0, failed=True)

    # ---- Phase 3: Forge ----
    print(f"\n{'#'*60}")
    print(f"#  Phase 3/4: Forge (遣将)")
    print(f"{'#'*60}")
    try:
        result = do_forge(str(profile_path), skill_name, str(skill_dir))
        phases["forge"] = {"status": "ok", "result": result}
        if not skill_name:
            skill_name = result.get("skill_name", "")
    except Exception as e:
        phases["forge"] = {"status": "error", "error": str(e)}
        print(f"  ✗ Forge failed: {e}")
        return _summary(target, depth, skill_name, phases, t0, failed=True)

    # ---- Phase 4: Validate ----
    print(f"\n{'#'*60}")
    print(f"#  Phase 4/4: Validate (验)")
    print(f"{'#'*60}")
    try:
        report = do_validate(str(skill_dir))
        phases["validate"] = {"status": "ok", "report": report}
    except Exception as e:
        phases["validate"] = {"status": "error", "error": str(e)}
        print(f"  ✗ Validate failed: {e}")

    return _summary(target, depth, skill_name, phases, t0, failed=False)


def _summary(target: str, depth: str, skill_name: str, phases: dict, t0: float, failed: bool) -> dict:
    elapsed = time.time() - t0
    gate_failures = sum(1 for p in phases.values() if p.get("status") == "gate_failed")
    errors = sum(1 for p in phases.values() if p.get("status") == "error")

    print(f"\n{'='*60}")
    print(f"  Pipeline complete in {elapsed:.1f}s")
    for name, phase in phases.items():
        icon = "✓" if phase["status"] == "ok" else "⚠" if phase["status"] == "gate_failed" else "✗"
        print(f"  {icon} {name}: {phase['status']}")
    if gate_failures:
        print(f"  ⚠ {gate_failures} quality gate(s) failed — generated skill may be low quality")
    if errors:
        print(f"  ✗ {errors} phase(s) errored")
    print(f"{'='*60}\n")

    return {
        "target": target,
        "depth": depth,
        "skill_name": skill_name,
        "elapsed_seconds": elapsed,
        "phases": {k: {"status": v["status"]} for k, v in phases.items()},
        "gate_failures": gate_failures,
        "errors": errors,
        "failed": failed or errors > 0,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Spirit Forge (拘灵遣将) — Unified pipeline: Capture → Distill → Forge → Validate"
    )
    parser.add_argument("target", help="Person identifier: URL, @handle, github.com/user, or 'Name, Domain'")
    parser.add_argument("--depth", choices=["L1", "L2", "L3"], default="L2")
    parser.add_argument("--skill-name", default="", help="Desired skill identifier")
    parser.add_argument("--output-dir", default="", help="Base output directory")
    parser.add_argument("--stop-on-gate", action="store_true", help="Halt pipeline if a quality gate fails")
    args = parser.parse_args()

    result = pipeline(args.target, args.depth, args.skill_name, args.output_dir, args.stop_on_gate)
    sys.exit(1 if result["failed"] else 0)
