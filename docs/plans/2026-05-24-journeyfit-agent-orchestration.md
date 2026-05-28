# JourneyFit Agent Orchestration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Hermes-native JourneyFit orchestration plugin where specialist roles collaborate dynamically, pass structured context to each other, and can be called multiple times when the user's goal, risks, limitations, or intermediate outputs justify it.

**Architecture:** Add a JourneyFit plugin under `plugins/journeyfit_orchestrator/` that registers Hermes tools, a JourneyFit toolset, and optional slash commands. The plugin uses Hermes' existing plugin context, `ctx.llm.complete_structured`, tool registry, toolsets, hooks, and optional `delegate_task` dispatch instead of introducing a parallel agent framework in core.

**Tech Stack:** Hermes plugin API, `ctx.register_tool`, `ctx.register_command`, `ctx.llm.complete_structured`, optional `ctx.dispatch_tool("delegate_task", ...)`, Python dataclasses or Pydantic-style schemas if already present, pytest for unit tests.

---

## Product Intent

JourneyFit should not behave like one generic assistant trying to answer every fitness question. It should behave like a coordinated team.

The important behavior is selective collaboration:

- If the user asks for a simple, generic suggestion with no relevant limitations, the system can answer with a lightweight flow.
- If the user has medical constraints, symptoms, medications, injury, pregnancy, eating disorder risk, chronic disease, or other safety-sensitive context, a doctor/medical task should run early.
- If the user asks about diet, nutrition runs.
- If the user asks about training, training runs.
- If the user asks for a practical weekly routine, scheduler runs after nutrition/training outputs exist.
- If any agent produces guidance affected by medical constraints, the doctor/medical agent can be called again to validate the result.
- If outputs conflict or fail validation, a revision loop should ask the responsible agent to adjust, instead of hiding contradictions in the final response.

The first implementation should be conservative, observable, and easy to test. It should not require rewriting the existing agent core.

## Profile-Aware Routing

JourneyFit should not rely only on raw user text. It should consider the active Hermes profile as a first-class input alongside `user_profile` and conversation history.

The active profile should influence:

- Which JourneyFit toolset defaults are enabled.
- How aggressively the planner routes to medical validation.
- Whether the experience is lightweight, balanced, or safety-first.
- Which specialist outputs should be preferred when multiple plans are possible.

Existing profile folders in the repo already cover the main JourneyFit roles:

- `orchestrator` for intake, routing, and consolidation.
- `doctor-agent` for medical triage and validation.
- `nutritionist` for nutrition planning.
- `personal-trainer` for training planning.

For the first rollout, I do not suggest inventing new profile names. The right move is to wire the planner and tool routing to these existing profiles so the system uses the profile that already matches each role.

If we later want extra specialization, the only profile I would consider adding is a lightweight fallback profile for generic wellness queries. That is optional, not required for the first version.

## Existing JourneyFit Baseline

The repository already has the core JourneyFit role profiles in place:

- `orchestrator` (`.hermes/profiles/orchestrator/SOUL.md`)
- `doctor-agent` (`.hermes/profiles/doctor-agent/SOUL.md`)
- `nutritionist` (`.hermes/profiles/nutritionist/SOUL.md`)
- `personal-trainer` (`.hermes/profiles/personal-trainer/SOUL.md`)

Those profiles already describe the intended contract:

- The orchestrator extracts intake, chooses agents, defines execution order, and consolidates JSON.
- The doctor-agent handles safety triage and validation.
- The nutritionist builds the nutrition plan.
- The personal-trainer builds the workout plan.

Because that baseline already exists, the first implementation pass should refine and connect these existing profiles instead of inventing a second parallel agent hierarchy.

## Hermes-Native File Layout

```text
journeyfit-agent/
|-- plugins/
|   `-- journeyfit_orchestrator/
|       |-- plugin.yaml
|       |-- __init__.py
|       |-- schemas.py
|       |-- tools.py
|       |-- context.py
|       |-- task_graph.py
|       |-- policies.py
|       |-- planner.py
|       |-- executor.py
|       |-- collaboration.py
|       |-- specialists.py
|       |-- prompts.py
|       `-- cli.py
|
`-- tests/
    `-- plugins/
        `-- journeyfit_orchestrator/
            |-- test_intake.py
            |-- test_planner.py
            |-- test_executor.py
            |-- test_collaboration.py
            |-- test_specialists.py
            `-- test_tool_registration.py
```

Do not add generic root-level `orchestrator/` and `agents/` packages first. In Hermes, this should start as a plugin so the work uses the surfaces the host already provides:

- `ctx.register_tool()` exposes JourneyFit orchestration as a normal Hermes tool.
- `ctx.register_command()` can expose `/journeyfit` for manual orchestration/debugging in CLI and gateway chat.
- Plugin toolsets are discovered by `toolsets.py`, so JourneyFit can be enabled/disabled like any other capability.
- `ctx.llm.complete_structured()` gives specialist calls typed JSON without hand-rolling provider/auth/fallback logic.
- `ctx.dispatch_tool("delegate_task", ...)` is available when the orchestrator needs real subagent reasoning instead of a single structured call.
- Hooks such as `pre_llm_call`, `post_tool_call`, and `on_session_end` are available later for context injection, telemetry, or cleanup, but they are not required for the first milestone.

The root `PLANEJAMENTO_ORQUESTRADOR.md` can remain as the initial sketch. This file is the Hermes-native implementation plan.

## Hermes Integration Shape

Register one main tool first:

```python
ctx.register_tool(
    name="journeyfit_orchestrate",
    toolset="journeyfit",
    schema=JOURNEYFIT_ORCHESTRATE_SCHEMA,
    handler=lambda args, **kw: run_journeyfit_orchestration(ctx, args, **kw),
)
```

Optional supporting tools can be added later:

```text
journeyfit_assess_intake
journeyfit_run_specialist
journeyfit_debug_trace
```

But the first version should expose a single useful tool to the parent Hermes agent:

```text
User asks fitness/nutrition/health-adjacent request
  -> Hermes parent agent decides to call journeyfit_orchestrate
  -> plugin orchestrator runs specialist graph internally
  -> plugin returns JSON string with answer, trace, safety notes
  -> Hermes parent replies to user
```

Register a slash command for manual testing:

```python
ctx.register_command(
    "journeyfit",
    handler=lambda raw: run_journeyfit_slash_command(ctx, raw),
    description="Run JourneyFit specialist orchestration.",
)
```

This works in the CLI and supported gateways without adding a new core slash command.

## Plugin Registration Contract

`plugins/journeyfit_orchestrator/__init__.py` should be thin:

```python
from .schemas import JOURNEYFIT_ORCHESTRATE_SCHEMA
from .tools import run_journeyfit_orchestration, run_journeyfit_slash_command


def register(ctx) -> None:
    ctx.register_tool(
        name="journeyfit_orchestrate",
        toolset="journeyfit",
        schema=JOURNEYFIT_ORCHESTRATE_SCHEMA,
        handler=lambda args, **kw: run_journeyfit_orchestration(ctx, args, **kw),
    )
    ctx.register_command(
        "journeyfit",
        handler=lambda raw: run_journeyfit_slash_command(ctx, raw),
        description="Run JourneyFit specialist orchestration.",
    )
```

`plugin.yaml` should identify it as a general plugin:

```yaml
name: journeyfit_orchestrator
version: 0.1.0
description: JourneyFit dynamic health and fitness orchestration.
```

The plugin must return JSON strings from registered tools because Hermes tool handlers are expected to return serialized results.

## When To Use Hermes Subagents

Most JourneyFit specialist steps should be `ctx.llm.complete_structured()` calls inside the plugin. They are bounded, typed, and use Hermes' configured provider, credentials, fallback, and audit logging.

Use `delegate_task` only when the specialist needs a full Hermes agent loop with tools, research, file access, or multi-step investigation.

Good first-version specialist call:

```text
Medical intake -> one structured LLM call through ctx.llm.complete_structured
Training plan -> one structured LLM call through ctx.llm.complete_structured
Medical validation -> one structured LLM call through ctx.llm.complete_structured
```

Use `ctx.dispatch_tool("delegate_task", ...)` later for cases like:

- A specialist needs web research with citations.
- A complex plan should be reviewed by a separate isolated Hermes agent.
- The work is broad enough to benefit from a child agent with restricted toolsets.

Example:

```python
ctx.dispatch_tool(
    "delegate_task",
    {
        "goal": "Review this JourneyFit training plan against the medical constraints.",
        "context": json.dumps(payload),
        "toolsets": ["web"],
        "max_iterations": 10,
    },
)
```

Subagents start with no parent context, so the plugin must pass the complete task payload in `context`.

## What Not To Build First

Avoid these in the first implementation:

- New root-level `agents/` package that bypasses Hermes plugin discovery.
- New core changes in `run_agent.py`, `model_tools.py`, `toolsets.py`, or `cli.py`.
- A custom provider/router for LLM calls.
- A separate long-running worker queue.
- Direct specialist-to-specialist calls.
- A second chat surface in the dashboard.

If the plugin needs more host capability, expand the generic plugin surface later instead of hardcoding JourneyFit into Hermes core.

## Core Principle

Specialist roles should not call each other directly.

Use this shape:

```text
journeyfit_orchestrate tool
  -> medical specialist role
  -> nutrition specialist role
  -> training specialist role
  -> scheduler specialist role
  -> reviewer specialist role
  -> synthesizer specialist role
```

Avoid this shape:

```text
nutrition specialist role
  -> medical specialist role
  -> training specialist role
```

The orchestrator owns coordination, dependencies, retries, risk policy, conflict resolution, and final assembly.

The orchestration must be a dynamic graph, not a fixed linear pipeline. The first task graph is only a hypothesis. After each task result, the orchestrator can decide to:

- Add a new task for the same agent.
- Send an output to another agent for validation.
- Ask the original agent to revise with new constraints.
- Skip a planned task because it became unnecessary.
- Stop early and ask the user a clarifying question.
- Continue with a limited-scope answer if safety policy prevents a full plan.

Example shape:

```text
medical_intake
  -> training_plan
  -> medical_validation_of_training
  -> training_revision_1
  -> medical_validation_of_training_revision_1
  -> final_answer
```

This applies to every domain. Nutrition can be revised after medical validation, training can be revised after scheduler feasibility checks, and schedule can be rebuilt after either nutrition or training changes.

## Agent Roles

### MedicalAgent

Purpose:

- Identify whether the request is safe to handle as general wellness guidance.
- Detect red flags, contraindications, injury constraints, medication/disease concerns, pregnancy/postpartum considerations, eating disorder risk, and cases requiring professional care.
- Produce guardrails for the other agents.
- Validate downstream outputs when the plan depends on medical, pain, injury, disease, medication, pregnancy, or recovery constraints.

It should not:

- Diagnose.
- Prescribe treatment.
- Replace a clinician.
- Generate the whole fitness plan unless the request is purely medical/safety triage.

Output should include:

```python
{
    "mode": "intake | validation",
    "risk_level": "low | medium | high",
    "red_flags": [],
    "requires_professional_review": False,
    "allowed_scope": "general_wellness | limited_plan | defer_to_clinician",
    "constraints_for_other_agents": [],
    "validation_target": None,
    "validation_status": "not_applicable | approved | needs_revision | blocked",
    "revision_requests": [],
    "user_questions_needed": []
}
```

The same agent can be used in two different task types:

- `medical_intake`: called before domain planning to produce constraints.
- `medical_validation`: called after a domain agent creates a plan that must be checked against those constraints.

For example, if the user says they have elbow tendinitis, `medical_intake` should produce limitations such as avoiding painful gripping, heavy elbow flexion/extension under load, aggressive pulling volume, or movements that worsen symptoms. Then `training_plan` uses those constraints. Afterward, `medical_validation` checks whether the training plan respected them.

### NutritionAgent

Purpose:

- Build nutrition guidance aligned with the user's goal, preferences, restrictions, and medical guardrails.
- Return structured meal strategy, macro/calorie assumptions if appropriate, hydration, adherence notes, and unknowns.

It should consume:

- User profile.
- Goal classification.
- Medical constraints when present.
- Training plan, when nutrition needs to support training load.

Output should include:

```python
{
    "summary": "",
    "assumptions": [],
    "nutrition_strategy": {},
    "meal_structure": [],
    "constraints_respected": [],
    "warnings": [],
    "questions": []
}
```

### TrainingAgent

Purpose:

- Build workout guidance aligned with goal, available days, experience, equipment, injuries, and medical guardrails.
- Return structured weekly plan, progression rules, intensity guidance, rest days, and modifications.

It should consume:

- User profile.
- Goal classification.
- Medical constraints when present.
- Nutrition output if training load should affect fueling guidance.

Output should include:

```python
{
    "summary": "",
    "assumptions": [],
    "weekly_training_plan": [],
    "progression": {},
    "constraints_respected": [],
    "warnings": [],
    "questions": []
}
```

### SchedulerAgent

Purpose:

- Combine nutrition, training, sleep/recovery, availability, and routine constraints into a usable weekly schedule.

It should consume:

- Nutrition result.
- Training result.
- User availability.
- Time windows and adherence preferences.

Output should include:

```python
{
    "weekly_schedule": [],
    "routine_notes": [],
    "tradeoffs": [],
    "missing_inputs": []
}
```

### ReviewerAgent

Purpose:

- Check cross-agent consistency before final synthesis.
- Detect contradictions such as training volume too high for medical constraints, nutrition too aggressive for goal/risk, or schedule impossible for availability.
- Identify which specialist should be called again when a result needs targeted revision.

ReviewerAgent is not a replacement for MedicalAgent. Medical-sensitive outputs must be validated by MedicalAgent/DoctorAgent, not only by the general reviewer.

It should return:

```python
{
    "approved": True,
    "issues": [],
    "revision_requests": []
}
```

A revision request should be addressed to a specific agent:

```python
{
    "target_agent": "training",
    "reason": "Plan includes high-impact running despite knee pain.",
    "required_change": "Replace running with low-impact conditioning."
}
```

### SynthesizerAgent

Purpose:

- Convert structured outputs into a clear answer for the user.
- Preserve warnings and uncertainty.
- Avoid inventing details not present in task results.

It should consume all successful task results and produce:

```python
{
    "answer": "",
    "sections": [],
    "safety_notes": [],
    "follow_up_questions": [],
    "trace_summary": {}
}
```

## Decision Model

The orchestrator should make an initial routing decision before planning tasks, then keep making routing decisions after each task result. Planning is iterative.

Use this loop:

```text
assess user request
  -> create initial task graph
  -> run next executable task
  -> inspect result
  -> add validation/revision/follow-up tasks if needed
  -> repeat until final answer is safe and useful
```

The orchestrator should never assume that the first plan is complete. It should treat every specialist output as new evidence.

### Intake Signals

Create `plugins/journeyfit_orchestrator/planner.py` with:

```python
@dataclass
class IntakeAssessment:
    goal_type: str
    requested_domains: list[str]
    risk_signals: list[str]
    limitations: list[str]
    missing_profile_fields: list[str]
    requires_medical_intake: bool
    requires_medical_validation: bool
    requires_nutrition: bool
    requires_training: bool
    requires_scheduler: bool
    can_answer_lightweight: bool
```

Possible `goal_type` values:

- `weight_loss`
- `muscle_gain`
- `maintenance`
- `general_health`
- `performance`
- `rehab_or_pain`
- `meal_planning`
- `training_plan`
- `routine_planning`
- `unknown`

Possible domains:

- `medical`
- `nutrition`
- `training`
- `schedule`
- `behavior`
- `measurement`

### Medical Task Triggers

Call MedicalAgent early when the message or profile includes:

- Chest pain, fainting, dizziness, shortness of breath outside normal exertion.
- Recent surgery, pregnancy, postpartum, or injury.
- Diabetes, hypertension, heart disease, kidney disease, eating disorder, severe obesity, or other chronic condition.
- Medication affecting heart rate, appetite, blood pressure, glucose, or hydration.
- Very aggressive goals, such as extreme calorie restriction or rapid weight loss.
- Pain during movement or request for rehab.
- User asks whether something is medically safe.

Do not call MedicalAgent for every generic request. For example:

```text
"Me da uma ideia de cafe da manha com mais proteina."
```

can route to nutrition only.

Call MedicalAgent again after another agent produces an output when:

- The original request had a medical, pain, injury, medication, pregnancy, disease, or recovery limitation.
- The downstream plan changes load, intensity, diet restriction, supplementation, hydration, sleep, or recovery behavior in a way that could affect the limitation.
- The domain agent says it is uncertain whether its plan is safe.
- The reviewer detects a possible safety conflict.
- The user asks "isso e seguro?", "posso fazer?", or similar.

This means the medical role is not only a beginning step. It is also a validation step.

### Universal Re-entry Rules

Any agent can be called more than once when new information changes the task. The orchestrator should treat each agent result as a state transition, not as a final irreversible answer.

Use these rules:

- If a specialist output violates constraints, call the same specialist again with a revision task.
- If a specialist output introduces a new medical concern, call MedicalAgent again before continuing.
- If MedicalAgent changes constraints, re-run every downstream task that depended on the old constraints.
- If SchedulerAgent changes timing, volume, recovery, or adherence assumptions, re-run affected nutrition/training validation.
- If NutritionAgent changes calories, meal timing, hydration, or supplementation for a medical-sensitive user, run medical validation again.
- If TrainingAgent changes exercises, intensity, volume, recovery, pain rules, or progression for a medical-sensitive user, run medical validation again.
- If the reviewer finds cross-domain conflict, send the issue to the responsible specialist, not to the synthesizer.

The synthesizer should only run after the graph reaches a stable state:

```text
no pending required validation
no unresolved blocking issue
no required revision task left unrun
or the orchestrator explicitly chooses a limited-scope answer
```

This same pattern applies to every workflow, not only tendinitis. The doctor validates medical-sensitive outputs; the personal revises training; the nutritionist revises nutrition; the scheduler rebuilds the week; the reviewer checks consistency; the synthesizer explains the latest safe state to the user.

### Lightweight Flow

If the request is generic and no limitations are present, the planner can create only:

```text
lightweight_guidance -> synthesizer
```

or:

```text
nutrition_plan -> synthesizer
```

or:

```text
training_plan -> synthesizer
```

This prevents over-orchestration.

## Example Routing Scenarios

### Scenario A: Generic Nutrition

User:

```text
"Quero ideias de jantar com bastante proteina."
```

Tasks:

```text
nutrition_plan
final_answer depends on nutrition_plan
```

Medical agent is skipped.

### Scenario B: Weight Loss With No Limitations

User:

```text
"Quero emagrecer 5 kg e treinar 3x por semana."
```

Tasks:

```text
nutrition_plan
training_plan
weekly_schedule depends on nutrition_plan, training_plan
review_plan depends on weekly_schedule
final_answer depends on review_plan
```

Medical agent is optional unless profile has risk signals or the goal is too aggressive.

### Scenario C: Knee Pain

User:

```text
"Tenho dor no joelho e quero voltar a correr."
```

Tasks:

```text
medical_intake
training_plan depends on medical_intake
medical_validation_of_training depends on training_plan
training_revision_1 depends on medical_validation_of_training, if needed
medical_validation_of_training_revision_1 depends on training_revision_1, if needed
review_plan depends on latest approved training task
final_answer depends on review_plan
```

Nutrition is skipped unless requested.

### Scenario C2: Elbow Tendinitis Training Plan

User:

```text
"Tenho tendinite no cotovelo e quero um treino de superiores."
```

Tasks:

```text
medical_intake
  -> outputs elbow tendinitis constraints, safe scope, red flags, movements to avoid

training_plan depends on medical_intake
  -> personal creates a training plan respecting medical constraints

medical_validation_of_training depends on training_plan
  -> doctor validates whether the personal respected the tendinitis limitations

training_revision_1 depends on medical_validation_of_training, if doctor says needs_revision
  -> personal adjusts exercise selection, volume, grip/load, intensity, and pain rules

medical_validation_of_training_revision_1 depends on training_revision_1, if needed
  -> doctor validates the revised plan

final_answer depends on latest safe training output and latest medical validation
```

This is the reference pattern for any medical-sensitive workflow. The doctor is not only called first. The doctor can be called again after nutrition, training, scheduler, or any other specialist output that must be checked.

### Scenario D: Diabetes And Diet Plan

User:

```text
"Tenho diabetes tipo 2 e quero uma dieta para perder peso."
```

Tasks:

```text
medical_intake
nutrition_plan depends on medical_intake
medical_validation_of_nutrition depends on nutrition_plan
nutrition_revision_1 depends on medical_validation_of_nutrition, if needed
review_plan depends on latest approved nutrition task
final_answer depends on review_plan
```

Training is skipped unless requested.

### Scenario E: Full Lifestyle Plan

User:

```text
"Quero um plano semanal de treino, alimentacao e rotina. Tenho hipertensao e pouco tempo."
```

Tasks:

```text
medical_intake
nutrition_plan depends on medical_intake
training_plan depends on medical_intake
medical_validation_of_nutrition depends on nutrition_plan
medical_validation_of_training depends on training_plan
nutrition_revision_1 depends on medical_validation_of_nutrition, if needed
training_revision_1 depends on medical_validation_of_training, if needed
weekly_schedule depends on nutrition_plan, training_plan
medical_validation_of_schedule depends on weekly_schedule, if medical constraints affect timing/recovery
review_plan depends on weekly_schedule
revision tasks if needed
final_answer depends on review_plan
```

## Task Model

Create `plugins/journeyfit_orchestrator/task_graph.py`:

```python
from dataclasses import dataclass, field
from typing import Any, Literal


TaskStatus = Literal["pending", "running", "done", "failed", "skipped"]
TaskType = Literal[
    "intake",
    "domain_plan",
    "validation",
    "revision",
    "schedule",
    "review",
    "synthesis",
]


@dataclass
class AgentTask:
    id: str
    agent: str
    task_type: TaskType
    objective: str
    dependencies: list[str] = field(default_factory=list)
    input_context: dict[str, Any] = field(default_factory=dict)
    expected_output: str = ""
    validation_target: str | None = None
    revision_of: str | None = None
    status: TaskStatus = "pending"
    result: dict[str, Any] | None = None
    error: str | None = None
    retry_count: int = 0
    max_retries: int = 0
```

`task_type` is required because the same agent can run different kinds of work. For example, the medical agent can run `intake` before the plan and `validation` after the plan. `validation_target` points at the task being checked. `revision_of` points at the previous task being corrected.

## Context Model

Create `plugins/journeyfit_orchestrator/context.py`:

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class OrchestrationContext:
    user_message: str
    user_profile: dict[str, Any]
    conversation_history: list[dict[str, Any]] = field(default_factory=list)
    intake: dict[str, Any] = field(default_factory=dict)
    shared: dict[str, Any] = field(default_factory=dict)
    task_results: dict[str, dict[str, Any]] = field(default_factory=dict)
    active_constraints: dict[str, Any] = field(default_factory=dict)
    latest_task_by_agent: dict[str, str] = field(default_factory=dict)
    validation_history: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    trace: list[dict[str, Any]] = field(default_factory=list)
```

The trace should be developer-facing. The user-facing answer should come from `final_answer`.

`active_constraints` is the current shared source of truth for safety and personalization constraints. Medical intake can add constraints. Medical validation can refine them. Revisions must consume the latest version.

## Specialist Runner Contract

Create `plugins/journeyfit_orchestrator/specialists.py`.

```python
from typing import Any

from .context import OrchestrationContext
from .task_graph import AgentTask


class SpecialistRunner:
    def __init__(self, plugin_ctx):
        self.plugin_ctx = plugin_ctx

    def run(self, task: AgentTask, context: OrchestrationContext) -> dict[str, Any]:
        """Run one JourneyFit specialist task through Hermes plugin LLM access."""
        schema = schema_for_task(task)
        prompt = prompt_for_task(task, context)
        result = self.plugin_ctx.llm.complete_structured(
            instructions=prompt.instructions,
            input=[{"type": "text", "text": prompt.input_text}],
            json_schema=schema,
            schema_name=f"journeyfit.{task.agent}.{task.task_type}",
            purpose=f"journeyfit.{task.agent}.{task.task_type}",
            temperature=0.2,
            max_tokens=1600,
        )
        if result.parsed is None:
            return {"error": "specialist_parse_failed", "raw": result.text}
        return result.parsed
```

Specialists are roles, not independent Python agent classes in the first version. The runner maps `task.agent` and `task.task_type` to a prompt and JSON schema, then uses Hermes' host-owned provider/auth/fallback through `ctx.llm`.

## Planner Design

Create `plugins/journeyfit_orchestrator/planner.py`.

The planner should:

1. Read `context.intake`.
2. Decide the minimal useful task graph.
3. Put medical intake first only when needed.
4. Add medical validation tasks after domain tasks when medical constraints exist.
5. Add review when multiple domain agents produce outputs.
6. Add scheduler only when the user asks for routine, calendar, weekly plan, or availability alignment.
7. Always add final synthesis.
8. Allow the orchestrator to append tasks later when validation or review creates a revision request.

Pseudo-flow:

```python
class TaskPlanner:
    def plan(self, context: OrchestrationContext) -> list[AgentTask]:
        intake = context.intake
        tasks = []
        domain_dependencies = []

        if intake["requires_medical_intake"]:
            tasks.append(AgentTask(
                id="medical_intake",
                agent="medical",
                task_type="intake",
                objective="Assess safety constraints and scope for this request.",
                expected_output="Risk level, red flags, allowed scope, constraints.",
            ))
            domain_dependencies.append("medical_intake")

        produced_domains = []

        if intake["requires_nutrition"]:
            tasks.append(AgentTask(
                id="nutrition_plan",
                agent="nutrition",
                task_type="domain_plan",
                objective="Create nutrition guidance within known constraints.",
                dependencies=list(domain_dependencies),
                expected_output="Structured nutrition strategy.",
            ))
            produced_domains.append("nutrition_plan")

            if intake["requires_medical_validation"]:
                tasks.append(AgentTask(
                    id="medical_validation_of_nutrition",
                    agent="medical",
                    task_type="validation",
                    objective="Validate nutrition guidance against medical constraints.",
                    dependencies=["nutrition_plan"],
                    validation_target="nutrition_plan",
                    expected_output="Approval, revision request, or blocked status.",
                ))
                produced_domains[-1] = "medical_validation_of_nutrition"

        if intake["requires_training"]:
            tasks.append(AgentTask(
                id="training_plan",
                agent="training",
                task_type="domain_plan",
                objective="Create training guidance within known constraints.",
                dependencies=list(domain_dependencies),
                expected_output="Structured training strategy.",
            ))
            produced_domains.append("training_plan")

            if intake["requires_medical_validation"]:
                tasks.append(AgentTask(
                    id="medical_validation_of_training",
                    agent="medical",
                    task_type="validation",
                    objective="Validate training guidance against medical constraints.",
                    dependencies=["training_plan"],
                    validation_target="training_plan",
                    expected_output="Approval, revision request, or blocked status.",
                ))
                produced_domains[-1] = "medical_validation_of_training"

        if intake["requires_scheduler"]:
            tasks.append(AgentTask(
                id="weekly_schedule",
                agent="scheduler",
                task_type="schedule",
                objective="Combine available plans into a practical routine.",
                dependencies=list(produced_domains),
                expected_output="Weekly schedule.",
            ))
            produced_domains = ["weekly_schedule"]

            if intake["requires_medical_validation"]:
                tasks.append(AgentTask(
                    id="medical_validation_of_schedule",
                    agent="medical",
                    task_type="validation",
                    objective="Validate schedule timing and recovery against medical constraints.",
                    dependencies=["weekly_schedule"],
                    validation_target="weekly_schedule",
                    expected_output="Approval, revision request, or blocked status.",
                ))
                produced_domains = ["medical_validation_of_schedule"]

        if len(produced_domains) > 1 or intake["requires_medical_intake"]:
            tasks.append(AgentTask(
                id="review_plan",
                agent="reviewer",
                task_type="review",
                objective="Check safety, consistency, feasibility, and contradictions.",
                dependencies=list(produced_domains),
                expected_output="Approval or revision requests.",
            ))
            final_dependencies = ["review_plan"]
        else:
            final_dependencies = list(produced_domains)

        tasks.append(AgentTask(
            id="final_answer",
            agent="synthesizer",
            task_type="synthesis",
            objective="Create the final user-facing answer from task results.",
            dependencies=final_dependencies,
            expected_output="Final answer.",
        ))

        return tasks
```

This pseudo-code creates only the initial graph. `plugins/journeyfit_orchestrator/collaboration.py` is responsible for adding revision and re-validation tasks after execution begins.

## Collaboration Design

Create `plugins/journeyfit_orchestrator/collaboration.py`.

This module should handle revision requests from `ReviewerAgent`.

First version:

- Allow one revision pass per target task.
- Revision creates new tasks such as `training_revision_1`.
- Revision task depends on the original task plus `review_plan`.
- If the revised task is medically sensitive, add a new `medical_validation` task after the revision.
- Final answer depends on the latest approved result or the latest limited result plus unresolved warnings.

Example:

```text
training_plan
nutrition_plan
weekly_schedule
medical_validation_of_training -> asks training to reduce intensity
training_revision_1
medical_validation_of_training_revision_1
weekly_schedule_revision_1, if schedule depended on old training output
review_revision_1, if multiple outputs changed
final_answer
```

Keep this simple:

- One revision pass per target task only.
- Any revision of a medically sensitive output must be sent back to MedicalAgent.
- If still not approved, final answer should present a cautious answer with unresolved issues or ask for more information.

Pseudo-interface:

```python
class CollaborationManager:
    def next_tasks_after_result(self, completed_task, context, existing_tasks):
        if completed_task.agent == "medical" and completed_task.task_type == "validation":
            return self._tasks_for_medical_validation(completed_task, context)

        if completed_task.agent == "reviewer":
            return self._tasks_for_reviewer_feedback(completed_task, context)

        return []
```

Medical validation result handling:

```python
{
    "validation_status": "needs_revision",
    "validation_target": "training_plan",
    "revision_requests": [
        {
            "target_agent": "training",
            "target_task": "training_plan",
            "reason": "Plan includes heavy curls and pull-ups despite elbow tendinitis.",
            "required_change": "Replace with low-grip, pain-free alternatives and reduce elbow flexion load."
        }
    ]
}
```

Should produce:

```text
training_revision_1 depends on medical_validation_of_training
medical_validation_of_training_revision_1 depends on training_revision_1
```

## Executor Design

Create `plugins/journeyfit_orchestrator/executor.py`.

First version:

- Sequential.
- Dependency-aware.
- Fails closed for unknown agents or dependency deadlocks.
- Records task trace.
- Does not swallow failures silently.
- Allows new tasks to be appended during execution by the collaboration manager.

Behavior:

- A task can run when all dependencies have status `done`.
- If a dependency is `failed`, dependent tasks should become `skipped`, unless it is `final_answer`, which can still synthesize a failure response.
- Store every result in `context.task_results[task.id]`.
- Store trace events in `context.trace`.
- After each completed task, ask `CollaborationManager` whether new tasks should be appended.
- Stop when no pending/running tasks remain and `final_answer` is done.

Second version:

- Add parallel execution for independent tasks.
- Example: `nutrition_plan` and `training_plan` can run in parallel after `medical_intake`.

## Safety Policy

Create `plugins/journeyfit_orchestrator/policies.py`.

This should centralize rules instead of scattering them across agents.

Initial constants:

```python
MEDICAL_INTAKE_TERMS = [
    "dor no peito",
    "desmaio",
    "tontura",
    "gravida",
    "pos-parto",
    "diabetes",
    "hipertensao",
    "cardiaco",
    "cirurgia",
    "lesao",
    "dor no joelho",
    "dor lombar",
    "remedio",
    "medicamento",
    "transtorno alimentar",
]

AGGRESSIVE_GOAL_TERMS = [
    "perder 10 kg em 1 mes",
    "1000 calorias",
    "jejum extremo",
]
```

This list is a starting point, not a medical knowledge base. The system should err toward asking clarifying questions or limiting scope when risk is unclear.

## Plugin Tool API

Create `plugins/journeyfit_orchestrator/tools.py`:

```python
import json

from .context import OrchestrationContext
from .executor import TaskExecutor
from .planner import IntakeAnalyzer, TaskPlanner
from .specialists import SpecialistRunner


def run_journeyfit_orchestration(ctx, args: dict, **kwargs) -> str:
    context = OrchestrationContext(
        user_message=args["user_message"],
        user_profile=args.get("user_profile") or {},
        conversation_history=args.get("conversation_history") or [],
    )
    context.intake = IntakeAnalyzer().assess(context).__dict__
    tasks = TaskPlanner().plan(context)

    runner = SpecialistRunner(ctx)
    TaskExecutor(runner=runner).run(tasks, context)

    final = context.task_results.get("final_answer", {})
    return json.dumps({
        "success": True,
        "answer": final.get("answer", ""),
        "task_results": context.task_results,
        "intake": context.intake,
        "trace": context.trace,
        "warnings": context.warnings,
    }, ensure_ascii=True)


def run_journeyfit_slash_command(ctx, raw: str) -> str:
    result_json = run_journeyfit_orchestration(
        ctx,
        {"user_message": raw, "user_profile": {}, "conversation_history": []},
    )
    result = json.loads(result_json)
    return result.get("answer") or result_json
```

The registered tool returns a JSON string. The slash command returns the final answer for human testing.

## Integration Strategy

Do not replace Hermes' current agent loop. Let the parent Hermes agent call the plugin tool when the request is JourneyFit-related.

Use a three-step integration path:

1. Align the existing JourneyFit profile contracts in `.hermes/profiles/*/SOUL.md` so the orchestrator and specialists agree on the same intake and output fields.
2. Wire the active Hermes profile to use the correct JourneyFit role defaults and toolsets, so routing is shaped by session/profile context instead of only by explicit `/journeyfit` use.
3. Add an optional plugin or command surface only if the host needs a callable tool entrypoint from the general Hermes agent.

Target integration shape:

```text
Hermes CLI / gateway / API server
  -> normal AIAgent.run_conversation
  -> model sees journeyfit_orchestrate tool from journeyfit toolset
  -> tool runs plugin orchestration
  -> model receives JSON tool result
  -> final answer to user
```

Manual testing shape:

```text
/journeyfit Tenho tendinite no cotovelo e quero treino de superiores
```

## Implementation Tasks

### Task 0: Align the existing JourneyFit profiles

**Objective:** Make the current JourneyFit profile contracts consistent with one another before adding new code.

**Files:**

- Modify: `.hermes/profiles/orchestrator/SOUL.md`
- Modify: `.hermes/profiles/doctor-agent/SOUL.md`
- Modify: `.hermes/profiles/nutritionist/SOUL.md`
- Modify: `.hermes/profiles/personal-trainer/SOUL.md`
- Modify if needed: the matching `config.yaml` files under `.hermes/profiles/*/`

**Verification:**

- The orchestrator profile should describe the same selected-agent flow that the specialist profiles expect.
- The specialist profiles should accept the same input keys the orchestrator emits.
- The JSON contract should be stable enough to pass between profiles without ad hoc translation.

### Task 1: Scaffold the Hermes plugin

**Objective:** Add the JourneyFit plugin directory and registration shell.

**Files:**

- Create: `plugins/journeyfit_orchestrator/plugin.yaml`
- Create: `plugins/journeyfit_orchestrator/__init__.py`
- Create: `plugins/journeyfit_orchestrator/schemas.py`
- Create: `plugins/journeyfit_orchestrator/tools.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_tool_registration.py`

**Verification:**

Run:

```bash
pytest tests/plugins/journeyfit_orchestrator/test_tool_registration.py -v
```

Expected: plugin registers `journeyfit_orchestrate` in toolset `journeyfit` and `/journeyfit` as an in-session command.

### Task 2: Create orchestration data models

**Objective:** Add task graph and context contracts inside the plugin.

**Files:**

- Create: `plugins/journeyfit_orchestrator/task_graph.py`
- Create: `plugins/journeyfit_orchestrator/context.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_models.py`

**Verification:**

Run:

```bash
pytest tests/plugins/journeyfit_orchestrator/test_models.py -v
```

### Task 3: Add intake analyzer

**Objective:** Convert user message and profile into routing signals.

**Files:**

- Create: `plugins/journeyfit_orchestrator/policies.py`
- Modify: `plugins/journeyfit_orchestrator/planner.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_intake.py`

**Test cases:**

- Generic protein dinner requires nutrition only.
- Knee pain requires medical and training.
- Diabetes diet request requires medical and nutrition.
- Full weekly routine requires nutrition, training, and scheduler.
- Generic "melhorar saude" can use lightweight or basic guidance.

### Task 4: Add planner

**Objective:** Generate the minimal task graph from intake.

**Files:**

- Create: `plugins/journeyfit_orchestrator/planner.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_planner.py`

**Test cases:**

- Medical intake appears first when required.
- Nutrition and training depend on medical intake when present.
- Medical validation tasks are added after medically sensitive nutrition, training, or schedule tasks.
- Tendinitis flow creates `medical_intake -> training_plan -> medical_validation_of_training`.
- Scheduler depends on nutrition and training.
- Synthesizer always exists.
- Generic single-domain requests do not call unnecessary agents.

### Task 5: Add executor

**Objective:** Execute task graph in dependency order.

**Files:**

- Create: `plugins/journeyfit_orchestrator/executor.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_executor.py`

**Test cases:**

- Independent tasks run before dependent tasks.
- Deadlock raises a clear error.
- Unknown specialist role raises a clear error.
- Failed dependency causes dependent task skip.
- Final answer can still run for partial failure if configured.

### Task 6: Add specialist runner

**Objective:** Add a testable specialist runner that calls Hermes plugin LLM access through an injectable fake in tests.

**Files:**

- Create: `plugins/journeyfit_orchestrator/specialists.py`
- Create: `plugins/journeyfit_orchestrator/prompts.py`
- Modify: `plugins/journeyfit_orchestrator/schemas.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_specialists.py`

**Important:** In tests, fake `ctx.llm.complete_structured` so the orchestration logic is deterministic. In production, the runner uses Hermes host-owned provider/auth/fallback.

### Task 7: Wire the main tool

**Objective:** Make `journeyfit_orchestrate` run the planner, executor, specialist runner, collaboration manager, and return a JSON string.

**Files:**

- Modify: `plugins/journeyfit_orchestrator/tools.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_tool_registration.py`

**Verification:**

- Handler returns JSON string.
- JSON includes `success`, `answer`, `task_results`, `intake`, `trace`, and `warnings`.
- The parent Hermes agent can consume the tool result without custom integration.

### Task 8: Add slash command

**Objective:** Expose `/journeyfit <message>` for manual debugging in CLI/gateway sessions.

**Files:**

- Modify: `plugins/journeyfit_orchestrator/tools.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_tool_registration.py`

**Test cases:**

- Empty slash command returns usage.
- Non-empty slash command returns the final answer.
- Slash command does not bypass the same orchestration code path as the tool.

### Task 9: Add collaboration revision pass

**Objective:** Allow reviewer or medical validation to request one targeted revision per affected task.

**Files:**

- Create: `plugins/journeyfit_orchestrator/collaboration.py`
- Modify: `plugins/journeyfit_orchestrator/executor.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_collaboration.py`

**Test cases:**

- Reviewer request creates a revision task for the target agent.
- Medical validation request creates a revision task for the target agent.
- Revised medically sensitive tasks are sent back to MedicalAgent.
- Only one revision pass per target task is allowed in the first version.
- Final answer includes unresolved issues if review or medical validation still fails.

### Task 10: Add optional JourneyFit skill/profile guidance

**Objective:** Tell the parent Hermes agent when to call `journeyfit_orchestrate` without changing core code.

**Files:**

- Optional create: `skills/health/journeyfit-orchestration/SKILL.md`
- Or document profile/SOUL guidance for JourneyFit deployments.

**Guidance should say:**

- Use `journeyfit_orchestrate` for fitness, nutrition, medical-limitation, training, weekly routine, or health-adjacent planning.
- Do not use it for unrelated Hermes coding/research tasks.
- The tool returns final answer plus trace; preserve medical caveats.

### Task 11: Add optional subagent escalation

**Objective:** Allow selected specialist tasks to use `ctx.dispatch_tool("delegate_task", ...)` when configured.

**Files:**

- Modify: `plugins/journeyfit_orchestrator/specialists.py`
- Test: `tests/plugins/journeyfit_orchestrator/test_specialists.py`

**Rules:**

- Default path remains `ctx.llm.complete_structured`.
- Use `delegate_task` only when a task requires full Hermes tool use.
- Pass complete context because subagents start fresh.

### Task 12: Add observability hooks later

**Objective:** Add Hermes hooks only after the core tool is stable.

**Files:**

- Modify: `plugins/journeyfit_orchestrator/__init__.py`
- Add hook tests if hooks mutate or inject context.

**Possible hooks:**

- `pre_llm_call` to inject JourneyFit tool guidance for configured profiles.
- `post_tool_call` to log journeyfit trace summaries.
- `on_session_end` for cleanup or telemetry.

## First Milestone

Ship this first:

- Consistent JourneyFit profile contracts across `orchestrator`, `doctor-agent`, `nutritionist`, and `personal-trainer`
- Any required profile `config.yaml` wiring for JourneyFit routing
- `plugins/journeyfit_orchestrator/plugin.yaml` and `plugins/journeyfit_orchestrator/__init__.py` only if we decide the host needs a general Hermes-facing tool entrypoint
- `journeyfit_orchestrate` registered through `ctx.register_tool` only if that entrypoint is needed
- `/journeyfit` registered through `ctx.register_command` only if manual CLI debugging is required
- `AgentTask`
- `OrchestrationContext`
- `IntakeAnalyzer`
- `TaskPlanner`
- `TaskExecutor`
- `CollaborationManager`
- `SpecialistRunner` using injectable `ctx.llm.complete_structured`
- One bounded revision loop per affected task
- Medical validation after medically sensitive specialist outputs
- Unit tests for plugin registration, intake, planner, executor, collaboration, medical validation routing, specialist runner, and tool handler

Do not include yet:

- Parallel execution
- Deep LLM planning of the graph
- Persistent execution traces outside the tool result
- Dashboard
- Streaming task updates
- Unlimited multi-pass negotiation
- Core edits in `run_agent.py`, `model_tools.py`, `toolsets.py`, or `cli.py`

## Acceptance Criteria

The milestone is done when these examples route correctly:

```text
"Me da ideias de jantar proteico."
-> nutrition, synthesizer

"Tenho dor no joelho e quero correr."
-> medical_intake, training, medical_validation_of_training, reviewer, synthesizer

"Tenho tendinite no cotovelo e quero treino de superiores."
-> medical_intake, training, medical_validation_of_training, training_revision_1 if needed, medical_validation_of_training_revision_1 if needed, synthesizer

"Tenho diabetes e quero emagrecer."
-> medical_intake, nutrition, medical_validation_of_nutrition, nutrition_revision_1 if needed, synthesizer

"Quero treino e dieta para 3 dias por semana."
-> nutrition, training, scheduler, reviewer, synthesizer

"Quero uma rotina completa, mas tenho hipertensao."
-> medical_intake, nutrition, training, medical validations, scheduler, optional schedule validation, reviewer, synthesizer
```

And tests pass:

```bash
pytest tests/plugins/journeyfit_orchestrator -v
```

## Open Questions

- Will user profile data already include age, height, weight, restrictions, injuries, medications, and available days?
- Should the final API expose `task_results` and `trace` to clients, or only keep them for debugging?
- Should medical-sensitive flows block with questions, or return a limited general answer plus professional-care warning?
- Should we localize all final responses in Portuguese by default?
- Which specialist steps are cheap structured plugin LLM calls, and which deserve full `delegate_task` subagents?

## Recommended Next Step

Implement Tasks 1 through 9 as a Hermes plugin. After that, enable the `journeyfit` toolset in a JourneyFit profile and add skill/profile guidance so the parent Hermes agent knows when to call `journeyfit_orchestrate`.
