# BEAST Family First Web Portal

## Run locally

1. Configure the Express API with a PostgreSQL `DATABASE_URL`, a 32-byte-or-longer `JWT_SECRET`, and an initial Administrator account. Run database migrations with `npm run migrate`.
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

The current Express application implements only authentication and `GET /api/health`. Intake, review, and analytics endpoints are not implemented yet; the portal reports that condition instead of inventing cases, metrics, successful submissions, or decisions. Do not collect real family information until the backend endpoints and production privacy/security controls are operational.

Staff JWTs are held in an HTTP-only, same-site cookie and verified server-side. Browser code does not read or persist authentication tokens. The BFF limits which backend routes and roles can be used, but the backend must independently enforce authentication and authorization when its case APIs are implemented.
