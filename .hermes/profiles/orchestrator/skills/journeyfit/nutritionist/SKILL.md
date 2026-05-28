---
name: journeyfit-nutrition-intake
description: Collect nutrition context before meal guidance.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, nutrition, intake, food]
    related_skills: [journeyfit-routing, journeyfit-medical-intake, journeyfit-training-intake]
---

# JourneyFit Nutrition Intake

Use this skill when the orchestrator is ready to talk about food, meal structure, or dietary guidance and needs the missing nutrition details first.

## When to Use

- The user asks about meals, dieting, or eating patterns
- The user asks for nutrition support tied to a goal
- The user mentions food restrictions or eating habits

## Prerequisites

- Read [JourneyFit Intake Map](../references/intake-map.md)
- Check whether a medical first pass is needed
- Keep the intake practical, not exhaustive

## How to Run

1. Confirm the goal and the food-related ask.
2. Ask for allergies, intolerances, restrictions, and preferences.
3. Ask for meal timing and budget or access limits when relevant.
4. Capture what they actually eat now if the answer is vague.
5. Return the constraints and usable preferences for the next step.

## Quick Reference

| Signal | Ask |
|---|---|
| Meal planning | Goal, allergy, intolerance, restriction, preferences |
| Vague diet request | Current diet, meal schedule, budget, adherence issues |
| Performance-linked nutrition | Training days, recovery, timing, appetite pattern |

## Procedure

1. Keep the conversation short and specific.
2. Ask only the missing fields that change the plan.
3. Mark any food safety constraint clearly.
4. If the case crosses into medical risk, hand back to the orchestrator for doctor-first routing.

## Pitfalls

- Do not ignore allergies or intolerances
- Do not force a full meal plan when the goal is still vague
- Do not over-collect preferences that will not change the plan
- Do not proceed past obvious clinical risk without medical intake

## Verification

- The downstream nutrition plan should have enough information to avoid unsafe food choices
- The response should clearly separate preferences from hard constraints
