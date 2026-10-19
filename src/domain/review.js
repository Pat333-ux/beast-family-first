'use strict';

function recordReview(caseRecord, review) {
  if (!caseRecord || caseRecord.status !== 'pending_review') {
    throw new Error('Only cases awaiting review can receive a decision.');
  }
  if (!review || !['approved', 'declined'].includes(review.decision)) {
    throw new TypeError('A reviewer must select approved or declined.');
  }
  if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) {
    throw new TypeError('Reviewer identification is required.');
  }
  if (typeof review.notes !== 'string' || review.notes.length > 2000) {
    throw new TypeError('Review notes must be text no longer than 2000 characters.');
  }

  return {
    ...caseRecord,
    status: review.decision,
    review: {
      decision: review.decision,
      reviewer: review.reviewer.trim(),
      notes: review.notes.trim(),
      reviewedAt: new Date().toISOString()
    }
  };
}

module.exports = { recordReview };
