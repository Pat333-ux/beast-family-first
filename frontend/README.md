# BEAST Family First Web Portal

## Run locally

1. Configure the Express API with a PostgreSQL `DATABASE_URL`, a 32-byte-or-longer `JWT_SECRET`, a base64- or hex-encoded 32-byte `INTAKE_ENCRYPTION_KEY`, and an initial Administrator account. Run database migrations with `npm run migrate`.
2. Start the API on port 4000: `PORT=4000 npm start` from the repository root.
3. Copy `.env.example` to `.env.local` in this directory and set `JWT_SECRET` to the same secret used by the API. Keep `.env.local` private.
4. Install and run the frontend:

   ```sh
   npm install
   npm run dev
   ```

The portal is available at `http://localhost:3000`. Configure production secrets and HTTPS before deployment.

## API integration status

Login is proxied to the existing `POST /api/v1/auth/login` backend route. The review queue and analytics views call the contract endpoints `GET /api/v1/review/queue`, `POST /api/v1/review/approve`, `POST /api/v1/review/deny`, and `GET /api/v1/analytics/metrics`. The intake form calls `POST /api/v1/intake`.

Intake, review, and analytics endpoints are implemented in the Express API and require PostgreSQL migrations `001` and `002`. Partner routing requires `COMMUNITY_PARTNER_WEBHOOK_URL` and `WEBHOOK_SECRET`; without these, approvals are recorded but dispatch is reported as not configured. Resource counts reflect webhook-dispatched pathways, not confirmed service completion. Cost savings are estimates from optional `PATHWAY_SAVINGS_CENTS` configuration and default to zero; they are not measured outcomes. Do not collect real family information until production privacy/security controls are operational.

Staff JWTs are held in an HTTP-only, same-site cookie and verified server-side. Browser code does not read or persist authentication tokens. Both the portal proxy and Express API enforce role checks for staff endpoints. Configure the proxy with trusted backend and partner URLs only.
