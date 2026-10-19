const {
  createWebhookSignature,
  sendWebhook,
  verifyWebhookSignature
} = require('../src/engine/routingEngine');

const SECRET = 'webhook-test-secret-that-is-long-enough';
const PAYLOAD = { event: 'case.updated', caseId: 'case-123' };

describe('webhook HMAC signatures', () => {
  test('generates and verifies a signature for the same payload', () => {
    const signature = createWebhookSignature(PAYLOAD, SECRET);
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(true);
  });

  test('rejects altered payloads and malformed signatures', () => {
    const signature = createWebhookSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature({ ...PAYLOAD, caseId: 'other' }, signature, SECRET)).toBe(false);
    expect(verifyWebhookSignature(PAYLOAD, 'sha256=invalid', SECRET)).toBe(false);
  });

  test('sends the payload with the signature header', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await sendWebhook('https://partner.example.org/events', PAYLOAD, { secret: SECRET, fetchImpl });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.href).toBe('https://partner.example.org/events');
    expect(options.headers['X-BEAST-Signature']).toBe(
      createWebhookSignature(options.body, SECRET)
    );
    expect(JSON.parse(options.body)).toEqual(PAYLOAD);
  });
});
