# beast-family-first

BEAST Family First Program. Needs assessment, rules engine, human review, ledger integration.

## Authentication API

The Node.js API exposes `POST /api/v1/auth/login` and the Administrator-only
`POST /api/v1/auth/register`. Login returns an HS256 JWT that expires after
eight hours. Authentication endpoints are limited to 10 requests per IP per
15 minutes. Webhook deliveries use the `X-BEAST-Signature` HMAC-SHA256 header.

Set `DATABASE_URL` to a PostgreSQL connection string, `JWT_SECRET` to a
high-entropy secret of at least 32 bytes, and `INTAKE_ENCRYPTION_KEY` to a
base64-encoded or hex-encoded 32-byte key. Set `WEBHOOK_SECRET` and
`COMMUNITY_PARTNER_WEBHOOK_URL` to enable partner dispatch. Optional
`PATHWAY_SAVINGS_CENTS` JSON config supplies program-approved estimated savings
per pathway (for example, `{"HOUSING_STABILIZATION_GRANT":15000}`); estimates
default to zero and are not measured outcomes. Generate encryption and signing
keys with a secrets manager or `openssl rand -base64 32`. Apply database
migrations with `npm run migrate`, then start the API with `npm start`. Run
tests with `npm test`. Run the backend routes' enforced 100% coverage suite with
`npm run test:api:coverage`.

The first Administrator must be provisioned out of band with a bcrypt password
hash; public registration is not available. Do not use real family data until
deployment access controls, secret management, audit requirements, and
operational safeguards have been reviewed.

## Web portal

The Next.js portal is in [`frontend/`](frontend/). See
[`frontend/README.md`](frontend/README.md) for local setup and its current API
integration status. Staff login is connected to the Express authentication
route; intake, case review, and analytics require backend endpoints that are
implemented in the Express API. Seed the user table and configure real partner
integrations before enabling staff or family workflows.
