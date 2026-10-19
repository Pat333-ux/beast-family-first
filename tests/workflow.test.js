const { transition, canTransition } = require('../src/engine/workflowEngine');

const human = { type: 'human' };
test('happy path', () => {
  expect(transition('submitted', 'under_review')).toBe('under_review');
  expect(transition('under_review', 'approved', human)).toBe('approved');
  expect(transition('approved', 'dispatched')).toBe('dispatched');
  expect(transition('dispatched', 'closed')).toBe('closed');
});
test('rejects skips and non-human approval', () => {
  expect(canTransition('submitted', 'approved')).toBe(false);
  expect(() => transition('submitted', 'approved', human)).toThrow();
  expect(() => transition('under_review', 'approved', { type: 'system' })).toThrow();
});
