const { createHmac, timingSafeEqual } = require('node:crypto');

function serializePayload(payload) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

function createWebhookSignature(payload, secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError('A webhook secret is required');
  }

  return `sha256=${createHmac('sha256', secret).update(serializePayload(payload)).digest('hex')}`;
}

function verifyWebhookSignature(payload, signature, secret) {
  if (typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)) {
    return false;
  }
  if (typeof secret !== 'string' || secret.length === 0) return false;

  const expected = Buffer.from(createWebhookSignature(payload, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function sendWebhook(url, payload, {
  secret = process.env.WEBHOOK_SECRET,
  fetchImpl = globalThis.fetch
} = {}) {
  const target = new URL(url);
  if (target.protocol !== 'https:') {
    throw new Error('Webhook URLs must use HTTPS');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required');
  }

  const body = serializePayload(payload);
  const signature = createWebhookSignature(body, secret);
  const response = await fetchImpl(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BEAST-Signature': signature
    },
    body,
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status ${response.status}`);
  }
  return response;
}

module.exports = { createWebhookSignature, verifyWebhookSignature, sendWebhook };
