# JourneyFit Intake Map

Use this reference when the orchestrator needs to decide whether to answer directly, ask for clarification, or hand off to a specialist.

## Core Routing Rule

If the user is only chatting, greet back and stay conversational.

If the request is incomplete but still generic, ask for only the missing minimum fields.

If the request clearly belongs to one specialist domain, hand off after the minimum intake is satisfied.

If there is pain, disease, medication, allergy, or other clinical risk, route through medical intake first.

## Minimum Intake by Domain

### Food / Nutrition

Ask for:

- goal
- allergies
- intolerances
- dietary restrictions
- food preferences
- meal schedule
- budget or access limits when relevant

Optional follow-up prompts:

- What is your current height, weight, and training goal?
- What foods do you avoid or cannot eat?
- What does a normal day of meals look like?
- Do you cook, eat out, or rely on quick meals?

### Training

Ask for:

- goal
- training experience
- days per week
- session duration
- equipment available
- current routine
- injuries or pain
- movement limits

Optional follow-up prompts:

- How many days per week can you train?
- How long can each session be?
- Do you train in a gym, at home, or both?
- What equipment do you have access to?
- What lifts or movements do you already know?

### Medical Risk

Ask for:

- symptom location
- onset and duration
- severity
- diagnosis already known
- medications
- red flags
- what makes it better or worse

Optional follow-up prompts:

- Is this new, recurring, or worsening?
- What makes it better or worse?
- Have you already been evaluated for this?
- Are there other symptoms happening at the same time?

## Clarify vs Escalate

- If the answer can be safely conversational, do not call a specialist.
- If the missing info is small and non-sensitive, ask it directly.
- If the missing info changes safety or plan quality, ask it before routing.
- If there is any strong clinical signal, route to doctor first.

## Output Shape

Prefer one of these outcomes:

- `conversation`
- `needs_more_info`
- `specialist_routing`
- `medical_first`

## Optional Question Rule

When the request is incomplete but still useful, prefer a short set of optional questions over a hard stop.

- Ask only the minimum useful questions.
- Make it clear that the user can skip any of them.
- The orchestrator should only collect context and should not synthesize specialist-level guidance.
