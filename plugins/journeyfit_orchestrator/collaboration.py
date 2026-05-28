"""Revision handling for JourneyFit."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import replace
from typing import Any

from plugins.journeyfit_orchestrator.context import OrchestrationContext
from plugins.journeyfit_orchestrator.task_graph import AgentTask


class CollaborationManager:
    def next_tasks_after_result(
        self,
        completed_task: AgentTask,
        context: OrchestrationContext,
        existing_tasks: dict[str, AgentTask],
    ) -> list[AgentTask]:
        if completed_task.agent == "doctor" and completed_task.task_type == "validation":
            return self._from_medical_validation(completed_task, context, existing_tasks)
        if completed_task.agent == "reviewer":
            return self._from_reviewer(completed_task, context, existing_tasks)
        return []

    def _revision_count(self, context: OrchestrationContext, target_task_id: str) -> int:
        counts = context.shared.setdefault("revision_counts", {})
        return int(counts.get(target_task_id, 0))

    def _bump_revision_count(self, context: OrchestrationContext, target_task_id: str) -> int:
        counts = context.shared.setdefault("revision_counts", {})
        counts[target_task_id] = int(counts.get(target_task_id, 0)) + 1
        return counts[target_task_id]

    def _create_revision(self, target_task: AgentTask, suffix: int, reason: str) -> AgentTask:
        revision_agent = target_task.agent
        revision_type = "revision"
        if target_task.agent == "doctor":
            revision_type = target_task.task_type
        new_id = f"{target_task.id}_revision_{suffix}"
        return AgentTask(
            id=new_id,
            agent=revision_agent,
            task_type=revision_type,  # type: ignore[arg-type]
            objective=f"Revisar o resultado anterior de {target_task.id}. {reason}".strip(),
            dependencies=[target_task.id],
            validation_target=target_task.validation_target,
            revision_of=target_task.id,
            input_context=dict(target_task.input_context),
            expected_output=target_task.expected_output,
        )

    def _needs_medical_validation(self, task: AgentTask) -> bool:
        return task.agent in {"nutritionist", "personal_trainer", "scheduler"}

    def _append_validation_for_revision(self, revision: AgentTask, context: OrchestrationContext) -> AgentTask | None:
        if not self._needs_medical_validation(revision):
            return None
        return AgentTask(
            id=f"medical_validation_of_{revision.id}",
            agent="doctor",
            task_type="validation",
            objective=f"Validar a revisao de {revision.revision_of or revision.id} contra restricoes clinicas.",
            dependencies=[revision.id],
            validation_target=revision.id,
            expected_output="Aprovacao, revisao ou bloqueio.",
        )

    def _from_medical_validation(
        self,
        completed_task: AgentTask,
        context: OrchestrationContext,
        existing_tasks: dict[str, AgentTask],
    ) -> list[AgentTask]:
        result = completed_task.result or {}
        status = str(result.get("validation_status") or "").lower()
        target_id = str(result.get("validation_target") or completed_task.validation_target or "")
        if status not in {"needs_revision", "blocked"} or not target_id:
            return []
        target_task = existing_tasks.get(target_id)
        if target_task is None:
            return []
        if self._revision_count(context, target_id) >= 1:
            context.warnings.append(f"Limite de revisao atingido para {target_id}.")
            return []
        requests = result.get("revision_requests") or []
        reason = "Ajuste pedido pela validacao medica."
        if isinstance(requests, list) and requests:
            first = requests[0]
            if isinstance(first, dict):
                reason = str(first.get("reason") or reason)
        revision_num = self._bump_revision_count(context, target_id)
        revision = self._create_revision(target_task, revision_num, reason)
        followups: list[AgentTask] = [revision]
        validation = self._append_validation_for_revision(revision, context)
        if validation:
            followups.append(validation)
        return followups

    def _from_reviewer(
        self,
        completed_task: AgentTask,
        context: OrchestrationContext,
        existing_tasks: dict[str, AgentTask],
    ) -> list[AgentTask]:
        result = completed_task.result or {}
        if result.get("approved") is True:
            return []
        requests = result.get("revision_requests") or []
        if not isinstance(requests, list) or not requests:
            return []
        followups: list[AgentTask] = []
        for request in requests:
            if not isinstance(request, dict):
                continue
            target_id = str(request.get("target_task") or "").strip()
            target_agent = str(request.get("target_agent") or "").strip()
            if not target_id and target_agent:
                for task in existing_tasks.values():
                    if task.agent == target_agent and task.task_type in {"domain_plan", "schedule"}:
                        target_id = task.id
                        break
            if not target_id or self._revision_count(context, target_id) >= 1:
                continue
            target_task = existing_tasks.get(target_id)
            if target_task is None:
                continue
            reason = str(request.get("reason") or request.get("required_change") or "Ajuste pedido pelo reviewer.")
            revision_num = self._bump_revision_count(context, target_id)
            revision = self._create_revision(target_task, revision_num, reason)
            followups.append(revision)
            validation = self._append_validation_for_revision(revision, context)
            if validation:
                followups.append(validation)
        return followups

