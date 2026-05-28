---
name: hermes-agent-ops
description: Use when changing Hermes profiles, logs, tools, or plugins.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [hermes, profiles, plugins, logging, tools, ops]
    related_skills: [hermes-agent, codex, journeyfit-orchestrator, journeyfit-business-rules]
---

# Hermes Agent Ops

## Overview

Use this skill when you need to change Hermes behavior in this repo: profiles,
logging, tool wiring, plugin enablement, or core execution paths. It is a
navigation map, not a full platform manual.

Prefer the narrowest edit that matches the behavior:
- profile or prompt change -> profile files
- plugin behavior -> plugin bundle
- global runtime behavior -> core Hermes files

See [reference/change-map.md](references/change-map.md) for the quick file map.

## When to Use

- A profile is not using the right tool or prompt
- Logging is missing, too noisy, or not profile-aware
- A plugin should be enabled or disabled for a profile
- A tool belongs in a plugin but not in Hermes core
- You need to find the right file before editing

## Quick Reference

| Area | Edit here |
|---|---|
| Profile prompt/behavior | `.hermes/profiles/<name>/SOUL.md` |
| Profile config | `.hermes/profiles/<name>/config.yaml` |
| Logs | `hermes_logging.py`, `.hermes/profiles/<name>/logs/` |
| Core tools | `tools/*.py`, `tools/registry.py`, `toolsets.py` |
| Plugins | `plugins/<name>/plugin.yaml`, `plugins/<name>/__init__.py` |
| Verification | `tests/`, `scripts/run_tests.sh` |

## Procedure

1. Identify whether the change belongs to profile, plugin, or core.
2. Open the smallest file that owns the behavior.
3. Prefer plugin/profile edits before touching shared Hermes code.
4. If the behavior involves tools, verify the toolset path as well as the prompt.
5. Run the narrowest tests that cover the path, then inspect logs.

## Common Pitfalls

1. Changing only `SOUL.md` when the tool is not enabled in `config.yaml`.
2. Patching core files when a plugin can own the behavior.
3. Assuming logs are global; profile logs and root logs can differ.
4. Forgetting that tool availability is controlled by toolsets plus checks.

## Verification

- Confirm the active profile points at the intended plugin.
- Check the relevant log files for the expected tool calls.
- Run focused tests for the changed layer before widening the scope.
