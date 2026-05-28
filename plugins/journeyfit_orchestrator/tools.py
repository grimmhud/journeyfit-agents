"""Tool handlers for JourneyFit."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from plugins.journeyfit_orchestrator.context import OrchestrationContext
from plugins.journeyfit_orchestrator.executor import TaskExecutor
from plugins.journeyfit_orchestrator.planner import IntakeAnalyzer, TaskPlanner
from plugins.journeyfit_orchestrator.policies import normalize_text
from plugins.journeyfit_orchestrator.specialists import SpecialistRunner
from tools.registry import tool_error


logger = logging.getLogger(__name__)


def _build_context(args: dict[str, Any]) -> OrchestrationContext:
    return OrchestrationContext(
        user_message=str(args.get("user_message") or ""),
        user_profile=args.get("user_profile") or {},
        conversation_history=args.get("conversation_history") or [],
        profile_name=str(args.get("profile_name") or args.get("profile") or "orchestrator"),
    )


def _history_text(context: OrchestrationContext) -> str:
    parts = [context.user_message or ""]
    for item in context.conversation_history or []:
        if isinstance(item, dict):
            parts.append(str(item.get("content") or ""))
        else:
            parts.append(str(item))
    return "\n".join(part for part in parts if part)


def _user_prefers_assumptions(text: str) -> bool:
    normalized = normalize_text(text)
    markers = [
        "pode assumir",
        "pode fazer suposicoes",
        "pode seguir com suposicoes",
        "sem mais perguntas",
        "segue com o que tem",
        "não precisa perguntar",
        "nao precisa perguntar",
        "não pergunte",
        "nao pergunte",
    ]
    return any(marker in normalized for marker in markers)


def _infer_profile_hints(context: OrchestrationContext) -> dict[str, Any]:
    profile = dict(context.user_profile or {})
    text = _history_text(context)
    normalized = normalize_text(text)

    if "age" not in profile or profile.get("age") in (None, ""):
        match = re.search(r"\b(\d{1,3})\s*(?:anos|anos de idade)\b", normalized)
        if match:
            profile["age"] = int(match.group(1))

    if "weight_kg" not in profile or profile.get("weight_kg") in (None, ""):
        match = re.search(r"\b(\d{2,3}(?:[.,]\d+)?)\s*kg\b", normalized)
        if match:
            profile["weight_kg"] = float(match.group(1).replace(",", "."))

    if "training_days_per_week" not in profile or profile.get("training_days_per_week") in (None, ""):
        match = re.search(r"\b(\d)\s*(?:x|vezes|dias?)\s*(?:por semana|na semana|/semana)?\b", normalized)
        if match:
            profile["training_days_per_week"] = int(match.group(1))

    if "equipment_available" not in profile or profile.get("equipment_available") in (None, "", []):
        equipment: list[str] = []
        if "academia" in normalized or "gym" in normalized:
            equipment.append("academia")
        if "casa" in normalized or "home" in normalized:
            equipment.append("casa")
        if any(token in normalized for token in ["halter", "dumbbell", "barra", "elast", "máquina", "maquina", "rack", "banco"]):
            equipment.extend(["equipamentos livres"])
        if equipment:
            profile["equipment_available"] = sorted(set(equipment))

    return profile


def _question_for_field(field_name: str) -> str | None:
    mapping = {
        "age": "Qual a sua idade?",
        "weight_kg": "Qual o seu peso atual?",
        "training_days_per_week": "Quantos dias por semana voce consegue treinar?",
        "meal_schedule": "Como e sua rotina de refeicoes ao longo do dia?",
        "equipment_available": "Voce treina em academia, em casa ou nos dois?",
        "injuries": "Tem alguma lesao que eu precise considerar?",
        "pain": "Tem alguma dor atual ou recorrente?",
        "conditions": "Tem alguma condicao de saude importante?",
        "medications": "Usa algum medicamento?",
    }
    return mapping.get(field_name)


def _render_follow_up_message(questions: list[str]) -> str:
    if not questions:
        return "Posso personalizar melhor o contexto. Se quiser, responda com mais detalhes e eu ajusto."
    lines = [
        "Posso personalizar melhor o contexto com algumas perguntas opcionais.",
        "Voce pode responder so as que quiser; se preferir, eu sigo com suposicoes seguras.",
        "",
    ]
    lines.extend(f"- {question}" for question in questions)
    return "\n".join(lines)


def _conversation_mode(context: OrchestrationContext) -> bool:
    text = normalize_text(context.user_message or "")
    return text in {"oi", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi"}


def _route_question_fields(assessment) -> list[str]:
    if assessment.requires_medical_intake:
        return ["pain", "injuries", "conditions"]
    if assessment.requires_training and assessment.requires_nutrition:
        return ["age", "weight_kg", "training_days_per_week"]
    if assessment.requires_nutrition:
        return ["age", "weight_kg", "meal_schedule"]
    if assessment.requires_training:
        return ["age", "weight_kg", "training_days_per_week"]
    return ["age", "weight_kg", "training_days_per_week"]


def _missing_route_fields(profile: dict[str, Any], fields: list[str]) -> list[str]:
    missing: list[str] = []
    for field in fields:
        value = profile.get(field)
        if value in (None, "", [], {}):
            missing.append(field)
    return missing


def run_journeyfit_orchestration(ctx, args: dict, **kwargs) -> str:
    try:
        started_at = time.monotonic()
        parent_agent = kwargs.get("parent_agent")
        trace_id = str(kwargs.get("task_id") or kwargs.get("request_id") or kwargs.get("session_id") or "-")
        context = _build_context(args)
        context.shared["trace_id"] = trace_id
        context.trace.append(
            {
                "event": "tool_invoked",
                "tool": "journeyfit_orchestrate",
                "profile": context.profile_name,
                "trace_id": trace_id,
                "user_message": context.user_message,
            }
        )
        logger.info(
            "journeyfit_orchestrate start trace_id=%s profile=%s message_chars=%d history_messages=%d",
            trace_id,
            context.profile_name,
            len(context.user_message or ""),
            len(context.conversation_history or []),
        )
        if _conversation_mode(context):
            payload = {
                "success": True,
                "mode": "conversation",
                "answer": "",
                "assistant_message": "Oi! Como posso te ajudar hoje?",
                "user_facing_message": "Oi! Como posso te ajudar hoje?",
                "intake": {},
                "selected_agents": [],
                "tasks": [],
                "task_results": {},
                "warnings": [],
                "follow_up_questions": [],
                "trace": context.trace,
            }
            return json.dumps(payload, ensure_ascii=False)

        context.user_profile = _infer_profile_hints(context)
        intake_started_at = time.monotonic()
        assessment = IntakeAnalyzer().assess(context)
        logger.info(
            "journeyfit_orchestrate intake done trace_id=%s elapsed_ms=%d goal_type=%s medical=%s nutrition=%s training=%s scheduler=%s lightweight=%s",
            trace_id,
            round((time.monotonic() - intake_started_at) * 1000),
            assessment.goal_type,
            assessment.requires_medical_intake,
            assessment.requires_nutrition,
            assessment.requires_training,
            assessment.requires_scheduler,
            assessment.can_answer_lightweight,
        )
        context.intake = assessment.__dict__

        route_fields = _route_question_fields(assessment)
        missing_route_fields = _missing_route_fields(context.user_profile, route_fields)
        if not assessment.requires_medical_intake and missing_route_fields and not _user_prefers_assumptions(context.user_message or ""):
            follow_up_questions: list[str] = []
            for field_name in missing_route_fields[:3]:
                question = _question_for_field(field_name)
                if question and question not in follow_up_questions:
                    follow_up_questions.append(question)
            assistant_message = _render_follow_up_message(follow_up_questions)
            payload = {
                "success": True,
                "mode": "needs_more_info",
                "answer": "",
                "assistant_message": assistant_message,
                "user_facing_message": assistant_message,
                "intake": context.intake,
                "selected_agents": [],
                "tasks": [],
                "task_results": {},
                "warnings": context.warnings,
                "follow_up_questions": follow_up_questions,
                "trace": context.trace,
            }
            logger.info(
                "journeyfit_orchestrate needs_more_info trace_id=%s profile=%s questions=%d trace=%d elapsed_ms=%d",
                trace_id,
                context.profile_name,
                len(follow_up_questions),
                len(context.trace),
                round((time.monotonic() - started_at) * 1000),
            )
            return json.dumps(payload, ensure_ascii=False)

        context.active_constraints = {
            "risk_signals": assessment.risk_signals,
            "limitations": assessment.limitations,
        }
        tasks = TaskPlanner().plan(context)
        context.selected_agents = sorted({task.agent for task in tasks if task.agent != "synthesizer"})
        runner = SpecialistRunner(ctx, parent_agent=parent_agent)
        TaskExecutor(runner=runner).run(tasks, context)
        final = context.task_results.get("final_answer") or {}
        answer = final.get("user_facing_response") or final.get("answer") or final.get("summary") or ""
        follow_up_questions: list[str] = []
        for task_id in [task.id for task in tasks]:
            result = context.task_results.get(task_id) or {}
            if not isinstance(result, dict):
                continue
            for field_name in ("questions", "user_questions_needed", "follow_up_questions"):
                items = result.get(field_name)
                if not isinstance(items, list):
                    continue
                for item in items:
                    if isinstance(item, str) and item not in follow_up_questions:
                        follow_up_questions.append(item)
        needs_more_info = any(
            str((context.task_results.get(task_id) or {}).get("status") or "").lower() == "needs_more_info"
            for task_id in context.task_results
        )
        assistant_message = answer or "Conclui o intake e montei a resposta."
        mode = "needs_more_info" if needs_more_info else "plan_ready"
        payload = {
            "success": True,
            "mode": mode,
            "answer": answer,
            "assistant_message": assistant_message,
            "user_facing_message": assistant_message,
            "intake": context.intake,
            "selected_agents": context.selected_agents,
            "tasks": [task.id for task in tasks],
            "task_results": context.task_results,
            "warnings": context.warnings,
            "follow_up_questions": follow_up_questions,
            "trace": context.trace,
        }
        logger.info(
            "journeyfit_orchestrate done trace_id=%s profile=%s tasks=%d follow_up_questions=%d trace=%d elapsed_ms=%d",
            trace_id,
            context.profile_name,
            len(tasks),
            len(follow_up_questions),
            len(context.trace),
            round((time.monotonic() - started_at) * 1000),
        )
        return json.dumps(payload, ensure_ascii=False)
    except Exception as exc:
        logger.exception("journeyfit_orchestrate failed")
        return tool_error(f"journeyfit_orchestrate failed: {exc}")


def run_journeyfit_slash_command(ctx, raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return "Uso: /journeyfit <pedido>"
    result_json = run_journeyfit_orchestration(
        ctx,
        {"user_message": text, "user_profile": {}, "conversation_history": []},
    )
    try:
        result = json.loads(result_json)
    except Exception:
        return result_json
    if result.get("mode") == "needs_more_info":
        return result.get("assistant_message") or result_json
    return result.get("answer") or result.get("assistant_message") or result.get("user_facing_message") or result_json
