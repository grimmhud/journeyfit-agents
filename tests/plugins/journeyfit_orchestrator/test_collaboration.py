from __future__ import annotations

from plugins.journeyfit_orchestrator.collaboration import CollaborationManager
from plugins.journeyfit_orchestrator.context import OrchestrationContext
from plugins.journeyfit_orchestrator.task_graph import AgentTask


def test_medical_validation_creates_revision_task():
    manager = CollaborationManager()
    context = OrchestrationContext(user_message="Tenho tendinite", user_profile={})
    original = AgentTask(
        id="training_plan",
        agent="personal_trainer",
        task_type="domain_plan",
        objective="Plano inicial",
    )
    validation = AgentTask(
        id="medical_validation_of_training",
        agent="doctor",
        task_type="validation",
        objective="Validar",
        validation_target="training_plan",
        result={
            "validation_status": "needs_revision",
            "validation_target": "training_plan",
            "revision_requests": [{"target_agent": "personal_trainer", "target_task": "training_plan", "reason": "Reduzir carga."}],
        },
    )
    tasks = manager.next_tasks_after_result(validation, context, {"training_plan": original})
    assert any(task.id == "training_plan_revision_1" for task in tasks)
    assert any(task.id == "medical_validation_of_training_plan_revision_1" for task in tasks)


def test_reviewer_creates_revision_task():
    manager = CollaborationManager()
    context = OrchestrationContext(user_message="Plano completo", user_profile={})
    original = AgentTask(
        id="nutrition_plan",
        agent="nutritionist",
        task_type="domain_plan",
        objective="Plano inicial",
    )
    reviewer = AgentTask(
        id="review_plan",
        agent="reviewer",
        task_type="review",
        objective="Revisar",
        result={
            "approved": False,
            "issues": [],
            "revision_requests": [{"target_agent": "nutritionist", "target_task": "nutrition_plan", "reason": "Simplificar."}],
        },
    )
    tasks = manager.next_tasks_after_result(reviewer, context, {"nutrition_plan": original})
    assert any(task.id == "nutrition_plan_revision_1" for task in tasks)

