BEAST FAMILY FIRST API CONTRACTS
Base URL
/api

Health Check
GET /api/health

Response

{ "status": "ok", "mode": "local-demo" }

Create Intake
POST /api/intakes

Request

{ "scores": { "housing": 80, "food": 75, "employment": 60, "mentalHealth": 70, "householdStress": 65, "childWellbeing": 90 }, "needs": [ "housing", "food", "mentalHealth" ] }

Response

{ "case": { "id": "uuid", "status": "pending_review", "assessment": { "score": 73, "priority": "Preventive support" } } }

List Cases
GET /api/cases

Response

{ "cases": [] }

Get Single Case
GET /api/cases/{id}

Response

{ "id": "uuid", "status": "pending_review", "assessment": {}, "resources": [] }

Review Case
POST /api/cases/{id}/review

Request

{ "decision": "approved", "reviewer": "Case Worker", "notes": "Eligibility confirmed." }

Response

{ "case": { "id": "uuid", "status": "approved" } }

Dashboard Metrics
GET /api/dashboard

Response

{ "familiesServed": 1000, "casesOpen": 145, "casesClosed": 855, "evictionsPrevented": 200, "stabilityRate": 82 }

Resource Routing
POST /api/route

Request

{ "needs": [ "housing", "food", "employment" ] }

Response

{ "resources": [ { "need": "housing", "resource": "Rental Assistance Navigation" }, { "need": "food", "resource": "SNAP Navigation" } ] }

Future Endpoints
POST /api/auth/login

POST /api/auth/logout

GET /api/users

GET /api/audit-logs

GET /api/reports

POST /api/agency-sync

POST /api/predictive-analysis

GET /api/analytics

Security Requirements
All future endpoints must support:

Authentication
Authorization
Audit Logging
Rate Limiting
TLS Encryption
Request Validation
Version
v1.0

Project: BEAST Family First Government Platform
