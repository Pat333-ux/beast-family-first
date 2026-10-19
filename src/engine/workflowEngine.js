/**
 * Intake workflow state machine:
 * submitted -> under_review -> approved -> dispatched -> closed
 * (under_review may also move to denied by a human caseworker).
 */
const TRANSITIONS = {
  submitted: ['under_review'],
  under_review: ['approved', 'denied'],
  approved: ['dispatched'],
  dispatched: ['closed'],
  denied: ['closed'],
  closed: []
};

// Transitions that are human decisions and cannot be made by the system/AI.
const HUMAN_ONLY = new Set(['approved', 'denied']);

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function transition(from, to, actor = {}) {
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, from)) {
    throw Object.assign(new Error(`Unknown status: ${from}`), { statusCode: 400 });
  }
  if (!canTransition(from, to)) {
    throw Object.assign(new Error(`Invalid transition: ${from} -> ${to}`), { statusCode: 409 });
  }
  if (HUMAN_ONLY.has(to) && actor.type !== 'human') {
    throw Object.assign(new Error(`Only a human caseworker may set status '${to}'`), { statusCode: 403 });
  }
  return to;
}

module.exports = { TRANSITIONS, canTransition, transition };
