# Safety, privacy, and responsible use

## Demo-only boundary

This application is not suitable for real people or production decisions. It has no sign-in or role enforcement, persistent storage, encryption-at-rest, access audit trail, retention controls, operational monitoring, or incident-response program. It binds to `127.0.0.1` by default; do not change that or expose the demo to a network with real data.

## Human services are human-led

- Scores summarize stated planning inputs; they are not diagnoses or objective measures of a family's worth or future behavior.
- No score or rule can deny, delay, or determine eligibility for a benefit, placement, shelter, or other service.
- Suggested resources are prompts to discuss and verify with the family, not automated referrals or guarantees of availability.
- A human review is mandatory before the demo records a next-step decision. The demo review endpoint itself is not authenticated and is not valid authorization for real services.
- Trauma, mental-health, child-wellbeing, and household-stress indicators are sensitive. This reference app does not infer them, predict violence, or make child-protection decisions.
- Do not use the model for predictive policing, surveillance, risk ranking, or automated government action.

## Data handling

The demo accepts only six bounded numeric inputs and selected category labels. It does not ask for direct identifiers. In-memory case records are discarded on process exit, but this is not a substitute for a reviewed data lifecycle. Do not enter real, identifiable, or confidential data, including in reviewer notes.

## Requirements before production consideration

Before any production design is approved, establish at minimum:

1. A lawful purpose, data inventory, retention schedule, data-sharing agreements, and privacy impact assessment.
2. Authentication, least-privilege authorization, secure session management, encryption in transit and at rest, and secrets management.
3. Tamper-evident audit records for access, changes, recommendations, reviewer decisions, and downstream financial actions.
4. A documented appeal/correction process, meaningful human oversight, accessibility and language access, and clear notice to families.
5. Independent validation for accuracy, disparate impact, accessibility, and failure modes across populations and changing conditions.
6. Threat modeling, penetration testing, backup/recovery, incident response, operational monitoring, and accountable ownership.
7. A separate authorization and reconciliation process for any benefit, payment, ledger, or government-system integration.

This list is a starting point, not a certification or legal opinion.
