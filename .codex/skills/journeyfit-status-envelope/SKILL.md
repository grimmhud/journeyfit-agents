---
name: journeyfit-status-envelope
description: Use when handling JourneyFit turn status and envelopes.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, status, envelope, schema, chat]
    related_skills: [journeyfit-orchestrator, journeyfit-business-rules]
---

# JourneyFit Status Envelope

## Overview

JourneyFit uses a conversational message plus a structured envelope. The
envelope tells us whether a turn is conversation, needs more info, or is ready
to render a plan.

## When to Use

- You are changing JourneyFit response shape, status, or prompt rules.
- You need to decide when `renderable_plan` should exist.
- You are editing the orchestrator or the frontend interpretation of its output.

## Rules

- `assistant_message` or `user_facing_message` is the human reply.
- `mode` or `status` marks the turn type.
- `missing_information` is for follow-up questions.
- `renderable_plan` stays `null` until the request is ready.
- Greetings and vague prompts should stay conversational.

## Pitfalls

- Do not force a plan for greetings like `oi`.
- Do not overwrite the chat transcript with raw JSON.
- Do not make the frontend infer plan readiness from text alone.

## Verification

- A greeting returns a normal message.
- Sparse input returns missing fields or questions.
- A complete request returns a populated renderable plan.
