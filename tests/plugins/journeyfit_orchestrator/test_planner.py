from __future__ import annotations

from plugins.journeyfit_orchestrator.context import OrchestrationContext
from plugins.journeyfit_orchestrator.planner import IntakeAnalyzer, TaskPlanner


def _plan(message: str, profile: dict | None = None):
    ctx = OrchestrationContext(user_message=message, user_profile=profile or {})
    ctx.intake = IntakeAnalyzer().assess(ctx).__dict__
    return TaskPlanner().plan(ctx)


def test_medical_intake_appears_first_when_required():
    tasks = _plan("Tenho dor no joelho e quero correr")
    assert tasks[0].id == "medical_intake"


def test_nutrition_and_training_depend_on_medical():
    tasks = _plan("Tenho dor no joelho e quero treino e dieta")
    nutrition = next(task for task in tasks if task.id == "nutrition_plan")
    training = next(task for task in tasks if task.id == "training_plan")
    assert "medical_intake" in nutrition.dependencies
    assert "medical_intake" in training.dependencies


def test_simple_combined_plan_only_uses_domain_agents():
    tasks = _plan("Quero treino e dieta para 3 dias por semana")
    ids = [task.id for task in tasks]
    assert ids == ["nutrition_plan", "training_plan", "final_answer"]


def test_synthesizer_always_exists():
    tasks = _plan("Quero jantar com proteina")
    assert tasks[-1].id == "final_answer"
