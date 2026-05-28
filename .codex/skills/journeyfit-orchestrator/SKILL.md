---
name: journeyfit-orchestrator
description: Use when editing JourneyFit orchestration and subagents.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, orchestration, subagents, delegation, fitness]
    related_skills: [hermes-agent, hermes-agent-ops, journeyfit-business-rules, codex]
---

# JourneyFit Orchestrator

## Overview

JourneyFit is the orchestration plugin that turns a user request into a small
task graph, runs the specialist agents, and returns one consolidated answer.
Use this skill when you are changing the plugin itself or the way Hermes calls
it from the orchestrator profile.

The current contract is:
- intake and routing happen in the plugin
- specialists run as real delegated subagents when a parent agent exists
- the simple path stays conservative and keeps the number of moving parts low

See [reference/flow.md](references/flow.md) for the execution flow and failure
signals.

## When to Use

- The orchestrator calls the wrong specialist
- You need to change the JourneyFit plugin entrypoint or schema
- A specialist should use delegation instead of a direct structured LLM call
- You need to debug a deadlock, timeout, or bad JSON in JourneyFit
- You want to verify which file owns a JourneyFit behavior

## Quick Reference

| Concern | Edit here |
|---|---|
| Tool entrypoint | `plugins/journeyfit_orchestrator/tools.py` |
| Planner/routing | `plugins/journeyfit_orchestrator/planner.py` |
| Safety heuristics | `plugins/journeyfit_orchestrator/policies.py` |
| Task graph | `plugins/journeyfit_orchestrator/task_graph.py` |
| Execution | `plugins/journeyfit_orchestrator/executor.py` |
| Specialist runtime | `plugins/journeyfit_orchestrator/specialists.py` |
| Prompt text | `plugins/journeyfit_orchestrator/prompts.py` |
| JSON schemas | `plugins/journeyfit_orchestrator/schemas.py` |
| Profile wiring | `.hermes/profiles/orchestrator/SOUL.md`, `.hermes/profiles/orchestrator/config.yaml` |

## Procedure

1. Decide whether the change is routing, execution, output shape, or profile
   wiring.
2. Edit the file that owns that layer instead of changing everything at once.
3. Keep the simple path small: doctor only for medical risk, nutritionist for
   diet, personal_trainer for training, synthesizer for the final answer.
4. If you add a new specialist or step, update the planner, schemas, tests, and
   the profile wiring together.
5. Verify through logs and the JourneyFit plugin tests before widening the fix.

## Common Pitfalls

1. Treating specialists as plain prompt snippets after the delegation path was
   added.
2. Editing `prompts.py` while forgetting `schemas.py` or the tests.
3. Changing routing in the planner but leaving the profile prompt stale.
4. Adding reviewer/scheduler to the simple path when the goal is stability.
5. Forgetting that a failed specialist can still cascade into a dead task graph.

## Verification

- Check the orchestrator log for `journeyfit_orchestrate start` and `done`.
- Look for `delegate_task_invoked` and `delegate_task_completed` in the trace.
- Confirm the selected agents match the user request.
- Run the JourneyFit plugin tests after any routing or schema change.
