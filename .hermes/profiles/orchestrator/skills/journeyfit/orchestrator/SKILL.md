---
name: journeyfit-routing
description: Route JourneyFit chat and escalation decisions.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, routing, intake, orchestration]
    related_skills: [journeyfit-medical-intake, journeyfit-nutrition-intake, journeyfit-training-intake]
---

# JourneyFit Orchestrator

Use this skill when the JourneyFit orchestrator needs to collect intake, ask for more context, or hand off clean context to a later specialist. This is the routing layer, not the domain content layer.

## When to Use

- The user is just chatting or greeting
- The request is vague, partial, or mixed
- You need to decide if a specialist is actually necessary
- You need to collect the smallest useful clarification set

## Prerequisites

- Read [JourneyFit Intake Map](../references/intake-map.md)
- Know the specialist tracks: doctor, nutritionist, personal trainer
- Keep the answer short when no specialist is needed
- Prefer specialist-provided `needs_more_info` and `follow_up_questions` over hardcoded heuristics
- When the request is vague, ask optional questions and let the user skip any of them

## How to Run

1. Classify the message as conversation, clarification, or specialist routing.
2. If it is only conversation, answer directly and stay human.
3. If it is generic but incomplete, ask only a small batch of the missing minimum fields and mark them optional.
4. If there is any medical risk signal, route to medical intake first.
5. If the request is ready for a specialist, hand off with the cleaned context.
6. Do not fabricate a specialist plan inside the orchestrator.

## Quick Reference

| Signal | Action |
|---|---|
| Greeting or small talk | Answer directly |
| Food request without allergies/restrictions | Ask clarifiers first |
| Training request without schedule/equipment | Ask clarifiers first |
| Pain, disease, medication, allergy | Medical first |
| Clear training or nutrition request with enough data | Hand off |

## Procedure

1. Check whether the user is actually asking for a plan.
2. Check whether the domain is specific enough to route.
3. Check whether missing data affects safety or quality.
4. If the answer can be useful without a specialist, keep it lightweight.
5. If the answer needs a specialist, route only after the minimum intake is captured.

## Pitfalls

- Do not call a specialist for pure conversation
- Do not ask for every field at once
- Do not let missing_profile_fields force unnecessary escalation
- Do not build a full plan before the domain is clear
- Do not hide follow-up questions behind a fake completion state
- Do not make optional questions feel mandatory
- Do not return training or nutrition advice as if it came from a specialist

## Verification

- If the user asked only to chat, the route should stay conversational
- If the answer is incomplete but safe, the route should become `needs_more_info`
- If the domain is clear, the next step should be a specialist handoff
