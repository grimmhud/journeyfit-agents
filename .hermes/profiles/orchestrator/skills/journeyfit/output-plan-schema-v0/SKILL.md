---
name: journeyfit-output-plan-schema-v0
description: Schema fixo v0 do JourneyFit para quando o orquestrador retorna um plano ao frontend. Use somente quando o modo for plan_ready ou needs_more_info — nao para respostas conversacionais ou perguntas de intake.
version: 1.0.0
author: JourneyFit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, schema, output, plan, frontend, v0]
    category: journeyfit
---

# JourneyFit — Output Schema v0 (Plan Response)

## Quando usar

**Apenas** quando o orquestrador vai entregar um plano ao frontend — `mode: plan_ready` ou `mode: needs_more_info` com plano provisório.

Nao use para:
- Respostas conversacionais (`mode: conversation`)
- Perguntas de intake ou clarificação sem plano gerado
- Mensagens de erro ou `urgent_stop` sem plano

## Schema obrigatorio

Responda apenas JSON valido, sem markdown. Todos os campos devem estar presentes mesmo quando vazios.

```json
{
  "status": "plan_ready | needs_more_info | urgent_stop",
  "mode": "plan_ready | needs_more_info",
  "user_facing_message": "mensagem curta e amigavel para o usuario em pt-BR",

  "notices": [
    {
      "agent": "doctor | nutritionist | personal_trainer",
      "type": "warning | info | restriction",
      "severity": "high | moderate | low",
      "message": "frase unica legivel no app — sem bullets, sem lista"
    }
  ],

  "follow_up_questions": [
    {
      "id": "q1",
      "question": "pergunta objetiva para o usuario",
      "priority": "high | medium"
    }
  ],

  "training": {
    "status": "ready | provisional | unavailable",
    "split": "nome da divisao ex: Upper/Lower 4x",
    "weekly_frequency": 4,
    "session_duration_minutes": { "min": 60, "max": 85 },
    "sessions": [
      {
        "id": "day_1_upper_a",
        "name": "Superiores A",
        "focus": "Empurrar + Puxar horizontal, bracos",
        "estimated_duration_minutes": 70,
        "exercises": [
          {
            "name": "nome do exercicio",
            "sets": 4,
            "reps": "5-8",
            "rest_seconds": 120,
            "rir": "1-3",
            "note": "instrucao curta ou null"
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
      "pre_workout_window": "60-150 min antes",
      "post_workout_window": "ate 2h depois"
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

## Regras de formato

- `reps` sempre string `"5-8"` — nunca `"5_a_8"` ou numero inteiro
- `rir` sempre string `"1-3"` ou `null` para exercicios tecnicos (prancha, etc.)
- `note` sempre string ou `null` — nunca string vazia `""`
- `notices` sempre presente, mesmo que array vazio
- `follow_up_questions` maximo 8 itens, sem duplicatas entre agentes
- Nenhum campo fora desta estrutura: sem `trace`, `task_results`, `delegate_*`, `guardrails`, `restrictions`, `assumptions`

## Como montar a partir dos sub-agentes

| Campo v0 | Origem |
|---|---|
| `notices[0]` | `doctor.v0_notice` |
| `notices[1]` | `nutritionist.v0_output.notice` |
| `notices[2]` | `personal_trainer.v0_output.notice` |
| `training` | `personal_trainer.v0_output.training` |
| `nutrition` | `nutritionist.v0_output.nutrition` |
| `follow_up_questions` | merge deduplicated de todos os agentes |

## Status do plano

| Situacao | status | training.status | nutrition.status |
|---|---|---|---|
| Tudo ok, dados suficientes | `plan_ready` | `ready` | `ready` |
| Dados parciais, plano provisorio | `plan_ready` | `provisional` | `provisional` |
| Faltam dados essenciais | `needs_more_info` | `provisional` | `provisional` |
| Doctor retornou urgente | `urgent_stop` | `unavailable` | `unavailable` |
