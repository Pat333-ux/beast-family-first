/**
 * Routing engine: dispatches approved intakes to matching community partners
 * via webhooks, recording each attempt in resource_allocations.
 * Only anonymized allocation data is sent (no family identity or intake payload).
 */
const db = require('../../db');

const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS || 3);
const BASE_DELAY_MS = Number(process.env.WEBHOOK_BASE_DELAY_MS || 500);
const TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 5000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Partner webhooks must be https and not point at loopback/private literals.
function isSafeWebhookUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.internal') || h.endsWith('.local')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
  if (h.startsWith('[')) return false;
  return true;
}

async function postWithRetry(url, body) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (res.ok) return { ok: true, attempts: attempt };
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e.message;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
  }
  return { ok: false, attempts: MAX_ATTEMPTS, error: lastError };
}

/**
 * @param {{requestId:string, priorityLevel:string, approvedPathways:string[]}} payload
 * @returns {Promise<{dispatched:number, failed:number, unmatched:string[]}>}
 */
async function dispatchResource(payload) {
  const { requestId, priorityLevel, approvedPathways = [] } = payload;
  const summary = { dispatched: 0, failed: 0, unmatched: [] };

  for (const pathway of approvedPathways) {
    const { rows: partners } = await db.query(
      `SELECT id, webhook_url FROM partner_organizations
       WHERE status = 'active' AND webhook_url IS NOT NULL AND pathways ? $1`,
      [pathway]
    );
    if (partners.length === 0) { summary.unmatched.push(pathway); continue; }

    for (const partner of partners) {
      let result;
      if (!isSafeWebhookUrl(partner.webhook_url)) {
        result = { ok: false, attempts: 0, error: 'Unsafe webhook URL' };
      } else {
        result = await postWithRetry(partner.webhook_url, {
          allocationRef: requestId,
          pathway,
          priorityLevel,
          sentAt: new Date().toISOString()
        });
      }
      await db.query(
        `INSERT INTO resource_allocations (intake_id, partner_id, resource_type, status, attempts, last_error)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [requestId, partner.id, pathway, result.ok ? 'dispatched' : 'failed', result.attempts, result.error || null]
      );
      if (result.ok) summary.dispatched++; else { summary.failed++; console.error(`Webhook failed for partner ${partner.id}: ${result.error}`); }
    }
  }
  return summary;
}

module.exports = { dispatchResource, isSafeWebhookUrl, postWithRetry };
