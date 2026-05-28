# JourneyFit Flow

## Execution Order

1. `tools.py` receives the tool call or slash command.
2. `planner.py` turns the user message into a task list.
3. `executor.py` runs the task graph in dependency order.
4. `specialists.py` executes each specialist.
5. `delegate_task` is used when a parent agent exists, so specialists become
   real subagents.
6. `synthesizer` consolidates the final answer.

## What Usually Changes

- Which specialists are selected: `planner.py` and `policies.py`
- Output shape: `schemas.py`
- Specialist prompts: `prompts.py`
- Subagent behavior: `specialists.py`
- Orchestrator entrypoint: `tools.py`
- Profile activation and tool enforcement:
  `.hermes/profiles/orchestrator/SOUL.md` and `config.yaml`

## Failure Signals

- `Task graph deadlocked` -> task dependencies or task completion names do not
  line up.
- `delegate_task_parse_failed` -> subagent output was not valid JSON.
- `peer closed connection without sending complete message body` -> provider or
  transport failure during a specialist call.
- Missing `journeyfit_orchestrate start` -> the tool was not called at all.

## Log Patterns

- `journeyfit_orchestrate start`
- `delegate_task_invoked`
- `task_start`
- `task_done`
- `journeyfit_orchestrate done`
