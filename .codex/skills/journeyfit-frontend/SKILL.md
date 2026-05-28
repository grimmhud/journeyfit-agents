---
name: journeyfit-frontend
description: Use when editing the JourneyFit React frontend.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, frontend, react, vite, mobile]
    related_skills: [journeyfit-status-envelope, journeyfit-orchestrator]
---

# JourneyFit Frontend

## Overview

`journeyfit-frontend` is the separate React/Vite app for JourneyFit chat and
manual JSON preview. Keep the chat natural and the preview driven by pasted
JSON.

## When to Use

- You are changing files under `journeyfit-frontend/`.
- You are changing how chat messages render.
- You are changing how the JSON preview works.

## Rules

- Show the orchestrator's human message in chat.
- Do not auto-fill the JSON editor from chat responses.
- Only render the preview from the editor content.
- Keep the layout mobile-first and simple.
- Treat `renderable_plan` as optional until the contract is finalized.

## Pitfalls

- Do not couple the preview to transient chat state.
- Do not import Hermes dashboard code into this app.
- Do not guess plan readiness from raw text alone.

## Verification

- The chat still works with structured envelopes.
- The JSON preview changes only when the editor changes.
- A greeting stays conversational and does not render a plan automatically.
