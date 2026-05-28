"""JourneyFit orchestration plugin."""

from __future__ import annotations

from plugins.journeyfit_orchestrator.schemas import JOURNEYFIT_ORCHESTRATE_SCHEMA
from plugins.journeyfit_orchestrator.tools import (
    run_journeyfit_orchestration,
    run_journeyfit_slash_command,
)


def register(ctx) -> None:
    """Register the JourneyFit tool and slash command."""
    ctx.register_tool(
        name="journeyfit_orchestrate",
        toolset="journeyfit",
        schema=JOURNEYFIT_ORCHESTRATE_SCHEMA,
        handler=lambda args, **kw: run_journeyfit_orchestration(ctx, args, **kw),
    )
    ctx.register_command(
        "journeyfit",
        handler=lambda raw: run_journeyfit_slash_command(ctx, raw),
        description="Run the JourneyFit orchestration flow.",
        args_hint="<request>",
    )
