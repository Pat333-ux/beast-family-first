# BEAST Family First

BEAST Family First is a local, dependency-free reference implementation of a human-services operating workflow: one needs assessment, explainable stability scoring, resource navigation suggestions, and a mandatory human review step.

## Run locally

Requirements: Node.js 18 or later.

```sh
npm start
```

Open <http://127.0.0.1:3000>. The server binds to loopback only. Intake records live in memory and disappear when the process exits.

```sh
npm test
```

## Repository map

- `src/domain/` — transparent scoring, resource suggestions, and review rules
- `src/data/` — in-memory demo store
- `src/http/` — local HTTP API and static-file server
- `public/` — accessible demo intake and review dashboard
- `test/` — domain and HTTP integration tests
- `docs/` — architecture, safety/privacy boundaries, and operating notes

## Demo API

- `GET /api/health` — local demo status
- `GET /api/cases` — in-memory demo cases
- `POST /api/intakes` — create a case from six 0–100 stability inputs and selected need categories
- `POST /api/cases/:id/review` — record an explicit `approved` or `declined` human review

The stability score is a weighted summary, not a diagnosis or eligibility decision. Resource suggestions are navigation prompts only. The application does not approve benefits or allocate public funds. Every suggested next step remains pending until a human reviewer records a decision.

## Important limitations

This is a local reference demo, **not a production system**. Do not enter real or identifiable family, child, health, financial, or case information. It has no authentication, authorization, durable storage, encryption-at-rest, audit-grade event ledger, government integrations, or production incident controls. Do not expose it to a network or connect it to live services.

See [the architecture](docs/architecture.md), [safety and privacy boundaries](docs/safety-and-privacy.md), and [operations](docs/operations.md) before extending it.
