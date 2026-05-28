from __future__ import annotations

import json
from types import SimpleNamespace

from plugins.journeyfit_orchestrator.tools import run_journeyfit_orchestration, run_journeyfit_slash_command


class _FakeLLM:
    def complete_structured(self, *, schema_name=None, **kwargs):
        if schema_name == "journeyfit.nutrition":
            return SimpleNamespace(
                parsed={
                    "summary": "Plano alimentar pronto.",
                    "assumptions": [],
                    "nutrition_strategy": {},
                    "meal_structure": [],
                    "constraints_respected": [],
                    "warnings": [],
                    "questions": [],
                },
                text="{}",
            )
        if schema_name == "journeyfit.training":
            return SimpleNamespace(
                parsed={
                    "summary": "Plano de treino pronto.",
                    "assumptions": [],
                    "weekly_training_plan": [],
                    "progression": {},
                    "constraints_respected": [],
                    "warnings": [],
                    "questions": [],
                },
                text="{}",
            )
        if schema_name == "journeyfit.synthesizer":
            return SimpleNamespace(
                parsed={
                    "answer": "Resposta final.",
                    "sections": [],
                    "safety_notes": [],
                    "follow_up_questions": [],
                    "trace_summary": {},
                },
                text="{}",
            )
        return SimpleNamespace(
            parsed={
                "mode": "intake",
                "risk_level": "low",
                "red_flags": [],
                "requires_professional_review": False,
                "allowed_scope": "general_wellness",
                "constraints_for_other_agents": [],
                "validation_target": None,
                "validation_status": "approved",
                "revision_requests": [],
                "user_questions_needed": [],
                "summary": "Sem risco.",
                "missing_information": [],
            },
            text="{}",
        )


def test_orchestration_collects_missing_context_only():
    ctx = SimpleNamespace()
    result = json.loads(
        run_journeyfit_orchestration(
            ctx,
            {
                "user_message": "quero mais musculos",
                "user_profile": {},
                "conversation_history": [],
            },
        )
    )

    assert result["success"] is True
    assert result["mode"] == "needs_more_info"
    assert result["selected_agents"] == []
    assert result["tasks"] == []
    assert result["task_results"] == {}
    assert result["answer"] == ""
    assert result["follow_up_questions"] == [
        "Qual a sua idade?",
        "Qual o seu peso atual?",
        "Quantos dias por semana voce consegue treinar?",
    ]


def test_orchestration_progresses_to_specialists_with_minimum_context():
    ctx = SimpleNamespace(llm=_FakeLLM())
    result = json.loads(
        run_journeyfit_orchestration(
            ctx,
            {
                "user_message": "quero mais musculos",
                "user_profile": {
                    "age": 29,
                    "weight_kg": 82,
                    "training_days_per_week": 4,
                },
                "conversation_history": [],
            },
        )
    )

    assert result["success"] is True
    assert result["mode"] == "plan_ready"
    assert result["answer"] == "Resposta final."
    assert result["selected_agents"] == ["personal_trainer"]


def test_slash_command_returns_intake_message():
    ctx = SimpleNamespace()
    answer = run_journeyfit_slash_command(ctx, "oi")
    assert answer == "Oi! Como posso te ajudar hoje?"
