# BEAST FAMILY FIRST API CONTRACTS

Base URL

`/api`

Health Check
`GET /api/health`

Response

`{ "status": "ok" }`

Create Intake
`POST /api/v1/intake`

Request

{
  "fullName": "Taylor Example",
  "email": "taylor@example.org",
  "phone": "",
  "county": "Marion",
  "dependentsCount": 2,
  "needs": ["food"]
}

Response

{
  "case": {
    "id": "uuid",
    "trackingId": "INT-2026-1234ABCD",
    "status": "pending_review",
    "assessment": {
      "score": 25,
      "priority": "STANDARD",
      "requiresHumanReview": true
    }
  }
}

Review Queue

`GET /api/v1/review/queue` — requires Caseworker, Supervisor, or Administrator.

Response

{ "cases": [] }

Approve Case

`POST /api/v1/review/approve` — requires Caseworker, Supervisor, or Administrator.

`{ "caseId": "uuid", "pathways": ["HOUSING_STABILIZATION_GRANT"], "notes": "Reviewed with family." }`

Denial requires a non-empty `notes` reason.

`POST /api/v1/review/deny` — same role requirement and request shape.

Response

`{ "case": { "id": "uuid", "status": "approved" }, "routing": { "status": "dispatched" } }`

Dashboard Metrics

`GET /api/v1/analytics/metrics` — requires Supervisor, Administrator, or Auditor.

Response

{
  "intakeVolumeByPriority": { "EMERGENCY": 0, "URGENT": 0, "STANDARD": 0 },
  "averageProcessingMinutes": null,
  "averageResolutionHours": null,
  "resourceFulfillmentByCategory": {},
  "estimatedIndianaCostSavings": 0,
  "savingsEstimateSource": "Configured pathway estimates for webhook-dispatched assignments; zero when no estimates are configured."
}

Authentication

`POST /api/v1/auth/login`

`POST /api/v1/auth/register` — Administrator only.

Staff routes require a signed bearer JWT in the Authorization header. Intake
details are encrypted with AES-256-GCM at rest; review and analytics access is
role-restricted and audited. Partner webhook delivery uses the
`X-BEAST-Signature` HMAC-SHA256 header.

Not yet implemented: resource completion reporting, general user listing,
reports, agency sync, and predictive analysis.

Project: BEAST Family First Government Platform
