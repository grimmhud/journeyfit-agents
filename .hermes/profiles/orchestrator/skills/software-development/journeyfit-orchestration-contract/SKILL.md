---
name: journeyfit-orchestration-contract
description: Use when shaping JourneyFit chat and JSON outputs.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, orchestration, schema, chat, frontend]
    category: software-development
    related_skills: [subagent-driven-development, writing-plans]
---

# JourneyFit Orchestration Contract

## Overview

JourneyFit should return a conversational answer and a structured envelope together.
The envelope is not the user-facing message itself; it is the transport for intent, missing data,
and optional renderable JSON.

## When to Use

- You are designing JourneyFit prompts, endpoint payloads, or frontend rendering rules.
- The user may be chatting naturally before a plan exists.
- The output may be `needs_more_info`, `conversation`, or `plan_ready`.
- You need to decide when the app should render JSON and when it should only show chat.

## Contract — Schema v0 (FIXED)

When `mode` is `plan_ready` or `needs_more_info`, the response **must** match this exact schema. No extra fields.

```json
{
  "status": "plan_ready | needs_more_info | conversation | urgent_stop",
  "mode": "plan_ready | needs_more_info | conversation",
  "user_facing_message": "short, friendly message in pt-BR",

  "notices": [
    {
      "agent": "doctor | nutritionist | personal_trainer",
      "type": "warning | info | restriction",
      "severity": "high | moderate | low",
      "message": "single readable sentence for the user"
    }
  ],

  "follow_up_questions": [
    { "id": "q1", "question": "...", "priority": "high | medium" }
  ],

  "training": {
    "status": "ready | provisional | unavailable",
    "split": "Upper/Lower 4x",
    "weekly_frequency": 4,
    "session_duration_minutes": { "min": 60, "max": 85 },
    "sessions": [
      {
        "id": "day_1_upper_a",
        "name": "Superiores A",
        "focus": "Empurrar + Puxar horizontal",
        "estimated_duration_minutes": 70,
        "exercises": [
          {
            "name": "exercise name",
            "sets": 4,
            "reps": "5-8",
            "rest_seconds": 120,
            "rir": "1-3",
            "note": "short execution note or null"
          }
        ]
      }
    ]
  },

  "nutrition": {
    "status": "ready | provisional | unavailable",
    "kcal": { "min": 2300, "max": 2700 },
    "macros": {
      "protein_g_per_kg": { "min": 1.6, "max": 2.2 },
      "carbs_g_per_kg": { "min": 3.0, "max": 5.0 },
      "fat_g_per_kg": { "min": 0.6, "max": 1.0 }
    },
    "meals_per_day": { "min": 3, "max": 5 },
    "hydration_ml_per_kg": { "min": 30, "max": 40 },
    "timing": {
      "pre_workout_window": "60-150 min before",
      "post_workout_window": "up to 2h after"
    },
    "meal_examples": {
      "breakfast": [],
      "lunch_dinner": [],
      "snacks": [],
      "pre_workout": [],
      "post_workout": []
    }
  }
}
```

Rules:

- `user_facing_message` is always the human-facing message, in pt-BR.
- `mode` tells the frontend what kind of turn this is.
- `notices` replaces all `guardrails`, `restrictions`, `stop_conditions`, and `safety` fields from sub-agents.
- `follow_up_questions` is deduplicated across all agents — max 8 total.
- `training` and `nutrition` come directly from `personal_trainer.v0_output` and `nutritionist.v0_output`.
- All arrays must be present even when empty. Never omit a field.
- `reps` is always a string like `"5-8"`, never `"5_a_8"`.
- `rir` is always a string like `"1-3"` or `null` — never an integer.
- `note` is always a string or `null` — never an empty string.
- No `trace`, `task_results`, `delegate_*`, `assumptions`, `restrictions`, `guardrails`, or internal routing fields.

## Procedure

1. Treat greetings, short replies, and vague prompts as conversational turns — return `mode: conversation` with just `user_facing_message`.
2. If context is missing but safe, return `mode: needs_more_info` with `follow_up_questions` and provisional `training`/`nutrition`.
3. Return `mode: plan_ready` when sub-agents have generated at least one `v0_output`.
4. Return `mode: urgent_stop` only when doctor returns `status: urgent` — set `training.status` and `nutrition.status` to `"unavailable"`.
5. Never return `renderable_plan: null` — the full schema is always the renderable plan.

## Pitfalls

- Do not include any field not present in the schema above.
- Do not return the sub-agent internal schemas (`task_results`, `agent_outputs`, etc.) in the final response.
- Do not make greetings like `oi` produce a full plan.
- Do not mix transport format decisions with orchestration decisions.

## Verification

- `oi` → `mode: conversation`, only `user_facing_message` populated, all other fields at defaults.
- Missing intake → `mode: needs_more_info`, provisional training/nutrition, follow_up_questions populated.
- Full request → `mode: plan_ready`, all v0 fields populated from sub-agent v0_outputs.
- The frontend renders without any field access errors.
