# Hermes Change Map

Use this when you need to remember where a Hermes behavior lives.

## Profiles

- Prompt and persona: `.hermes/profiles/<name>/SOUL.md`
- Profile config: `.hermes/profiles/<name>/config.yaml`
- Per-profile logs: `.hermes/profiles/<name>/logs/`

## Runtime

- Logging setup: `hermes_logging.py`
- Tool registry: `tools/registry.py`
- Tool dispatch: `model_tools.py`
- Agent tool execution: `agent/tool_executor.py`

## Plugins

- Plugin manifest: `plugins/<name>/plugin.yaml`
- Plugin entrypoint: `plugins/<name>/__init__.py`
- Plugin implementation: `plugins/<name>/*.py`

## Validation

- Unit tests: `tests/`
- Repo test runner: `scripts/run_tests.sh`
- Log inspection: `hermes logs` or the profile log files
