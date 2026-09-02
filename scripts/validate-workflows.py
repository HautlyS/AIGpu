#!/usr/bin/env python3
"""Validate the repository's GitHub Actions workflow shape without contacting GitHub."""
from pathlib import Path
import sys
import yaml

root = Path(__file__).resolve().parents[1]
workflow_dir = root / ".github" / "workflows"
files = sorted(workflow_dir.glob("*.yml"))
if not files:
    raise SystemExit("no workflow files found")

for path in files:
    data = yaml.safe_load(path.read_text()) or {}
    if not data.get("name"):
        raise SystemExit(f"{path}: missing workflow name")
    trigger = data.get("on", data.get(True))
    if not trigger:
        raise SystemExit(f"{path}: missing on trigger")
    jobs = data.get("jobs") or {}
    if not jobs:
        raise SystemExit(f"{path}: missing jobs")
    for job_name, job in jobs.items():
        if not isinstance(job, dict) or not job.get("runs-on") and not job.get("uses"):
            raise SystemExit(f"{path}: job {job_name} needs runs-on or uses")
        permissions = job.get("permissions")
        if permissions is not None and not isinstance(permissions, dict):
            raise SystemExit(f"{path}: job {job_name} permissions must be a map")

print(f"Validated {len(files)} GitHub Actions workflows: {', '.join(p.name for p in files)}")
