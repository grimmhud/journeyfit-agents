---
name: journeyfit-training-intake
description: Collect training context before workout guidance.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, training, intake, fitness]
    related_skills: [journeyfit-routing, journeyfit-medical-intake, journeyfit-nutrition-intake]
---

# JourneyFit Training Intake

Use this skill when the orchestrator is ready to discuss exercise, workout structure, or weekly training and needs the missing training details first.

## When to Use

- The user asks for a workout, split, or routine
- The user asks for training around a goal
- The user mentions equipment, availability, or exercise limits

## Prerequisites

- Read [JourneyFit Intake Map](../references/intake-map.md)
- Check for pain, lesion, or clinical restriction first
- Do not assume gym access or high training frequency

## How to Run

1. Confirm the goal and the training ask.
2. Ask for experience, days per week, session duration, and equipment.
3. Ask about pain, injury, and movement limits if not already known.
4. Capture the current routine only if it changes the plan.
5. Return the constraints and usable training context for the next step.

## Quick Reference

| Signal | Ask |
|---|---|
| Workout request | Goal, days per week, duration, equipment |
| Vague training request | Experience, current routine, consistency barriers |
| Training with pain | Pain location, triggers, movement limits, doctor first if needed |

## Procedure

1. Keep the intake practical.
2. Ask only the fields that change exercise selection or weekly volume.
3. Mark limitations clearly so the workout can respect them.
4. If the case needs medical review, stop and route back to the orchestrator.

## Pitfalls

- Do not write a full plan before knowing the available days and equipment
- Do not ignore pain or movement limits
- Do not overcomplicate the split for a beginner
- Do not proceed past clinical uncertainty without doctor input

## Verification

- The downstream training plan should know what is available, what is limited, and what must be avoided
- The response should be simple enough for the orchestrator to reuse directly
