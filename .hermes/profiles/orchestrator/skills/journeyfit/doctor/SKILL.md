---
name: journeyfit-medical-intake
description: Collect medical context before nutrition or training.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, medical, intake, safety]
    related_skills: [journeyfit-routing, journeyfit-nutrition-intake, journeyfit-training-intake]
---

# JourneyFit Doctor Intake

Use this skill when the orchestrator sees pain, disease, medication, allergy risk, or other medical ambiguity before training or nutrition can be made safely.

## When to Use

- The user mentions pain, lesion, tendinitis, or injury
- The user mentions disease, medication, surgery, or clinical restrictions
- The user asks for training or food advice with medical risk attached

## Prerequisites

- Read [JourneyFit Intake Map](../references/intake-map.md)
- Do not diagnose
- Prefer safety over completeness

## How to Run

1. Collect the symptom story before suggesting any plan.
2. Ask about location, onset, severity, duration, and triggers.
3. Ask about diagnosis, medication, and red flags when relevant.
4. Summarize the usable constraints for the downstream specialist.
5. If risk is unclear, keep the response conservative and route back to the orchestrator.

## Quick Reference

| Signal | Ask |
|---|---|
| Pain or lesion | Location, onset, severity, movement triggers |
| Disease or condition | Diagnosis, current status, treatment, restrictions |
| Medication | Name, reason, and whether it changes training or food advice |
| Possible red flag | Urgency, worsening, systemic symptoms, need for in-person care |

## Procedure

1. Separate symptoms from goals.
2. Capture the smallest set of facts needed to decide safe scope.
3. State what is allowed, what is limited, and what needs in-person care.
4. Return only the information that helps the next step.

## Pitfalls

- Do not jump to training or meal planning before the risk picture is clear
- Do not assume an old injury is still minor
- Do not ignore allergy or medication context
- Do not over-ask if the answer is already enough to route safely

## Verification

- The next specialist should know the medical constraints without rereading the whole conversation
- The response should clearly say whether the case is routine, cautious, or urgent
