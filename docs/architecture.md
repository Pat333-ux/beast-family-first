# Integrated architecture

## Mission and operating cycle

The BEAST platform is the orchestration infrastructure; Family First is its human-services operating division. The service model follows **Assess → Stabilize → Heal → Thrive**. This repository supplies a runnable local demonstration of intake, assessment, resource navigation, and human review. It does not implement live government integrations or production case management.

## Component map

```text
Browser dashboard
    │
    ├── one intake ──> Needs assessment
    │                    ├── weighted stability summary
    │                    └── need-category resource suggestions
    │
    └── review queue <── Human decision gate
                             │
                             └── approved / declined demo outcome

Future, separately governed interfaces:
  Government/provider directory · benefit systems · financial ledger
  Outcome analytics · monitoring · predictive research
```

### Intake and family profile

`POST /api/intakes` accepts six explicit 0–100 planning inputs and a list of resource categories. The local reference store creates a random case identifier. It deliberately does not collect names, addresses, contact information, free-form family histories, or government identifiers.

### Explainable assessment

`src/domain/assessment.js` computes the weighted mean using the visible weights: housing 15%, food 10%, employment 20%, mental-health support 20%, household stress 15%, and child wellbeing 20%. Inputs must be present, finite numbers in the range 0–100. A higher value means more stable. The score is rounded to an integer and placed in the stated band:

| Score | Planning band |
| --- | --- |
| 90–100 | Stable |
| 70–89 | Preventive support |
| 50–69 | Elevated risk |
| 30–49 | Crisis intervention |
| 0–29 | Emergency response |

The score is a conversation aid only. It does not rank people for access, establish a diagnosis, or determine eligibility.

### Resource navigation

`src/domain/routing.js` maps categories explicitly selected at intake to generic options to discuss. It does not verify eligibility, contact providers, submit applications, or execute payments. Mental-health and child/family-related suggestions require human triage; no intensity inference is made from the score.

### Human review and ledger boundary

New cases always start as `pending_review`. `src/domain/review.js` permits a single `approved` or `declined` review only when reviewer identification and a note are supplied. The decision records a timestamp. This demo gate is not authenticated or audit-grade, so it must not be used to authorize real services. No ledger integration exists: future disbursement interfaces must be separately authorized, audited, reconciled, and tested without allowing a score alone to trigger payment.

### Analytics, monitoring, and integration boundaries

The dashboard displays only counts derived from the current in-memory demo cases. There are no outcome claims, taxpayer-savings estimates, predictive signals, external data ingestion, or government/provider connectors. Future connections to housing, food, employment, healthcare, or public-benefit systems require data-sharing agreements, security review, purpose limitation, human accountability, and independent validation before implementation.

## API contracts

### Create an intake

`POST /api/intakes` JSON body:

```json
{
  "scores": {
    "housing": 50,
    "food": 50,
    "employment": 50,
    "mentalHealth": 50,
    "householdStress": 50,
    "childWellbeing": 50
  },
  "needs": ["housing", "food"]
}
```

Returns `201` with a pending-review case and assessment details. Invalid dimensions, out-of-range scores, and unknown categories return `400`.

### Record human review

`POST /api/cases/{id}/review` JSON body:

```json
{
  "decision": "approved",
  "reviewer": "demo-reviewer",
  "notes": "Demo review only."
}
```

Returns the updated record. A second decision for the same case is rejected.
