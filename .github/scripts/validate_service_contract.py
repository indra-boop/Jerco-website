"""Validate a repository service contract without executing deployment code."""
from __future__ import annotations

import argparse
import json
from pathlib import Path, PurePosixPath

PROFILES = {"production", "batch", "library", "documentation", "prototype", "archive"}
DOCS = {"architecture", "deployment", "runbook", "rollback"}


def validate(contract: dict, root: Path) -> list[str]:
    errors: list[str] = []
    if contract.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if contract.get("profile") not in PROFILES:
        errors.append("unknown profile")
    if not isinstance(contract.get("classification_basis"), str) or not contract["classification_basis"].strip():
        errors.append("classification_basis is required; classification is subject to owner review")
    services = contract.get("services")
    if not isinstance(services, list):
        return errors + ["services must be an array"]
    if contract.get("profile") in {"production", "batch"} and not services:
        errors.append("operational profile requires at least one service")
    seen = set()
    for service in services:
        if not isinstance(service, dict):
            errors.append("service must be an object")
            continue
        name = service.get("id")
        if not isinstance(name, str) or not name or name in seen:
            errors.append("service id must be unique and nonempty")
        if isinstance(name, str):
            seen.add(name)
        for field in ("runtime", "entrypoint", "config_authority", "health_check", "release_evidence"):
            if not isinstance(service.get(field), str) or not service[field].strip():
                errors.append(f"{name}: {field} is required")
        # Unknown operational ownership is visible, never guessed from CODEOWNERS.
        if "operational_owner" not in service:
            errors.append(f"{name}: operational_owner must be explicit (null if unassigned)")
        docs = service.get("documentation", {})
        if not isinstance(docs, dict) or set(docs) != DOCS:
            errors.append(f"{name}: documentation requires exactly {sorted(DOCS)}")
            continue
        for kind, value in docs.items():
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{name}: {kind} path is required")
                continue
            p = PurePosixPath(value)
            if p.is_absolute() or ".." in p.parts or "\\" in value or ":" in value:
                errors.append(f"{name}: {kind} must be a repository-relative path")
                continue
            target = root.joinpath(*p.parts)
            try:
                target.resolve().relative_to(root.resolve())
            except ValueError:
                errors.append(f"{name}: {kind} escapes repository")
                continue
            if not target.is_file():
                errors.append(f"{name}: missing {kind}: {value}")
                continue
            content = target.read_text(encoding="utf-8")
            if len(content.strip()) < 80 or "TRUNCATED FOR BREVITY" in content:
                errors.append(f"{name}: incomplete {kind}: {value}")
        checks = service.get("required_checks")
        if not isinstance(checks, list) or not checks or any(not isinstance(c, str) or not c.strip() for c in checks):
            errors.append(f"{name}: nonempty required_checks must be declared")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--manifest", default="SERVICE.json")
    args = parser.parse_args()
    try:
        manifest = (args.root / args.manifest).resolve()
        manifest.relative_to(args.root.resolve())
        data = json.loads(manifest.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("contract must be an object")
        errors = validate(data, args.root)
    except (OSError, ValueError, TypeError) as exc:
        errors = [str(exc)]
    for error in errors:
        print(f"ERROR: {error}")
    if not errors:
        print("Service contract passed. Runtime, settings, owner approval and restore remain separate gates.")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
