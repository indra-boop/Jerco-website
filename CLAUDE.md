# CLAUDE.md — Jerco-website

Read `README.md` and `deploy/README.md` before changes. This repository contains
the public static corporate site; the production sync timer follows `main`.
The application-owned operational contract is `deploy/SERVICE.json`. Keep internal
deployment metadata under `deploy/`, which the existing publisher excludes. Do not
add operational reports, secret values or client data to the public document root.

CI validates the contract, committed JavaScript syntax and JSON inputs. GitHub branch
protection and the installed server publisher must be verified separately; a workflow
file alone does not prove merge gating. Changes to generated CSS/JS require the
documented local build and relevant visual evidence. Do not change the official logo.

**NEXT ACTION:** verify current production version and required checks before release.
Operational owner is not inferred from CODEOWNERS.
