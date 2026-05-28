# JourneyFit Routing Matrix

## Training Requests

- Route to `personal_trainer`
- If the request also mentions nutrition, add `nutritionist`
- If the request also mentions pain, injury, condition, medication, or red
  flags, add `doctor` first

## Nutrition Requests

- Route to `nutritionist`
- If the request includes medical risk, add `doctor`
- If the request includes training, add `personal_trainer`

## Medical Risk

Treat these as medical risk signals until proven otherwise:

- pain
- injury
- condition
- medication
- red flag symptoms

## Sparse Profiles

When key profile fields are missing, prefer:

- conservative defaults
- explicit assumptions
- follow-up questions

Do not pretend the plan is fully personalized if the profile is incomplete.

## Files That Own The Rule

- `plugins/journeyfit_orchestrator/policies.py`
- `plugins/journeyfit_orchestrator/planner.py`
- `plugins/journeyfit_orchestrator/collaboration.py`
- `plugins/journeyfit_orchestrator/prompts.py`
- `plugins/journeyfit_orchestrator/schemas.py`
