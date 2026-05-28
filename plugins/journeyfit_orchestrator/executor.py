"""Dependency-aware JourneyFit executor."""

from __future__ import annotations

import time
from typing import Any

from plugins.journeyfit_orchestrator.collaboration import CollaborationManager
from plugins.journeyfit_orchestrator.context import OrchestrationContext
from plugins.journeyfit_orchestrator.task_graph import AgentTask
from plugins.journeyfit_orchestrator.specialists import SpecialistRunner


class TaskExecutor:
    def __init__(self, runner: SpecialistRunner, collaboration_manager: CollaborationManager | None = None):
        self.runner = runner
        self.collaboration_manager = collaboration_manager or CollaborationManager()

    def run(self, tasks: list[AgentTask], context: OrchestrationContext) -> dict[str, dict[str, Any]]:
        started_at = time.monotonic()
        task_map = {task.id: task for task in tasks}
        while True:
            ready = self._next_ready_task(tasks, task_map)
            if ready is None:
                pending = [task for task in tasks if task.status == "pending"]
                if not pending:
                    break
                self._mark_blocked(tasks, task_map, context)
                if any(task.status == "pending" for task in tasks):
                    raise RuntimeError("Task graph deadlocked")
                break
            self._run_task(ready, context)
            task_map[ready.id] = ready
            new_tasks = self.collaboration_manager.next_tasks_after_result(ready, context, task_map)
            if new_tasks:
                insert_at = tasks.index(ready) + 1
                for task in new_tasks:
                    if task.id not in task_map:
                        tasks.insert(insert_at, task)
                        insert_at += 1
                        task_map[task.id] = task
                        context.trace.append({"event": "task_appended", "task_id": task.id, "parent": ready.id})
        context.trace.append(
            {
                "event": "executor_done",
                "task_ids": [task.id for task in tasks],
                "elapsed_ms": round((time.monotonic() - started_at) * 1000),
            }
        )
        return context.task_results

    def _mark_blocked(self, tasks: list[AgentTask], task_map: dict[str, AgentTask], context: OrchestrationContext) -> None:
        for task in tasks:
            if task.status != "pending":
                continue
            if any(task_map[dep].status in {"failed", "skipped"} for dep in task.dependencies if dep in task_map) and task.id != "final_answer":
                task.status = "skipped"
                task.result = {"skipped": True}
                context.task_results[task.id] = task.result

    def _next_ready_task(self, tasks: list[AgentTask], task_map: dict[str, AgentTask]) -> AgentTask | None:
        def deps_done(task: AgentTask) -> bool:
            return all(dep in task_map and task_map[dep].status == "done" for dep in task.dependencies)

        def deps_blocked(task: AgentTask) -> bool:
            return any(dep in task_map and task_map[dep].status in {"failed", "skipped"} for dep in task.dependencies)

        for task in tasks:
            if task.status != "pending":
                continue
            if task.id != "final_answer" and deps_blocked(task):
                continue
            if deps_done(task):
                return task
        final = next((task for task in tasks if task.id == "final_answer" and task.status == "pending"), None)
        if final and all(task.status != "pending" for task in tasks if task.id != "final_answer"):
            return final
        return None

    def _run_task(self, task: AgentTask, context: OrchestrationContext) -> None:
        started_at = time.monotonic()
        task.status = "running"
        context.trace.append({"event": "task_start", "task_id": task.id, "agent": task.agent, "task_type": task.task_type})
        result = self.runner.run(task, context)
        if isinstance(result, dict) and result.get("error"):
            task.status = "failed"
            task.error = str(result.get("error"))
        else:
            task.status = "done"
        task.result = result if isinstance(result, dict) else {"result": result}
        context.task_results[task.id] = task.result
        context.trace.append(
            {
                "event": "task_done",
                "task_id": task.id,
                "status": task.status,
                "elapsed_ms": round((time.monotonic() - started_at) * 1000),
            }
        )
