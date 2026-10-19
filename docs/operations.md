# Local operations

## Prerequisites

- Node.js 18 or later
- No runtime or development package dependencies

## Start and test

```sh
npm start
npm test
```

The server listens on `127.0.0.1:3000`. Set `PORT` to a different local port if needed. Do not bind to a public interface or proxy the demo externally. Restarting the process clears the in-memory case store.

## Runtime behavior

- JSON request bodies are limited to 16 KiB.
- The server sends restrictive content-type, framing, referrer, cache, and content-security headers.
- Only the HTML, JavaScript, and CSS files under `public/` are served.
- There are no external API calls or third-party runtime dependencies.

These controls reduce demo exposure; they do not replace production authentication, authorization, audit, or infrastructure controls.

## Extending safely

Keep domain rules deterministic and testable. Document changes to score definitions and resource mappings, validate migrations and interfaces, and require a human decision before a recommendation can affect a real person's services. Do not connect live integrations until their data protection, identity, authorization, audit, failure, and reconciliation requirements have been approved.
