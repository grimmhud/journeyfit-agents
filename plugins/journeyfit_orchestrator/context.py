"""JourneyFit orchestration state."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class OrchestrationContext:
    user_message: str
    user_profile: dict[str, Any]
    conversation_history: list[dict[str, Any]] = field(default_factory=list)
    profile_name: str = "orchestrator"
    intake: dict[str, Any] = field(default_factory=dict)
    selected_agents: list[str] = field(default_factory=list)
    task_results: dict[str, dict[str, Any]] = field(default_factory=dict)
    active_constraints: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    trace: list[dict[str, Any]] = field(default_factory=list)
    shared: dict[str, Any] = field(default_factory=dict)
