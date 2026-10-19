'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assessFamily, DIMENSIONS } = require('../src/domain/assessment');
const { suggestResources } = require('../src/domain/routing');
const { recordReview } = require('../src/domain/review');

function scoresWith(value) {
  return Object.fromEntries(Object.keys(DIMENSIONS).map((key) => [key, value]));
}

test('assessment returns the weighted score and an explainable dimension breakdown', () => {
  const assessment = assessFamily({
    ...scoresWith(50),
    housing: 100
  });
  assert.equal(assessment.score, 58);
  assert.equal(assessment.priority, 'Elevated risk');
  assert.equal(assessment.dimensions.housing.weight, 15);
  assert.equal(assessment.dimensions.housing.value, 100);
});

test('all inclusive priority band boundaries match the published thresholds', () => {
  const bands = [
    [100, 'Stable'],
    [90, 'Stable'],
    [89, 'Preventive support'],
    [70, 'Preventive support'],
    [69, 'Elevated risk'],
    [50, 'Elevated risk'],
    [49, 'Crisis intervention'],
    [30, 'Crisis intervention'],
    [29, 'Emergency response'],
    [0, 'Emergency response']
  ];
  for (const [value, expected] of bands) {
    assert.equal(assessFamily(scoresWith(value)).priority, expected);
  }
});

test('assessment rejects missing, extra, non-finite, and out-of-range scores', () => {
  assert.throws(() => assessFamily(null), /object/);
  assert.throws(() => assessFamily({ housing: 10 }), /exactly/);
  assert.throws(() => assessFamily({ ...scoresWith(10), extra: 1 }), /exactly/);
  assert.throws(() => assessFamily({ ...scoresWith(10), housing: NaN }), /0 to 100/);
  assert.throws(() => assessFamily({ ...scoresWith(10), housing: -1 }), /0 to 100/);
  assert.throws(() => assessFamily({ ...scoresWith(10), housing: 101 }), /0 to 100/);
});

test('resource routing deduplicates selected needs and rejects unknown categories', () => {
  const suggestions = suggestResources(['housing', 'housing', 'mentalHealth']);
  assert.equal(suggestions.filter((item) => item.need === 'housing').length, 3);
  assert.equal(suggestions.filter((item) => item.need === 'mentalHealth').length, 1);
  assert.ok(suggestions.every((item) => item.status === 'suggested'));
  assert.throws(() => suggestResources(['unmapped']), /Unsupported/);
  assert.throws(() => suggestResources('housing'), /array/);
});

test('review records one explicit human decision and prevents a second decision', () => {
  const pending = { id: 'demo-id', status: 'pending_review' };
  const reviewed = recordReview(pending, {
    decision: 'approved',
    reviewer: '  reviewer-1 ',
    notes: ' Reviewed demo case. '
  });
  assert.equal(reviewed.status, 'approved');
  assert.equal(reviewed.review.reviewer, 'reviewer-1');
  assert.equal(reviewed.review.notes, 'Reviewed demo case.');
  assert.throws(() => recordReview(reviewed, {
    decision: 'declined', reviewer: 'reviewer-1', notes: 'Second decision'
  }), /Only cases awaiting review/);
});

test('review requires valid decision, reviewer, and bounded notes', () => {
  const pending = { status: 'pending_review' };
  assert.throws(() => recordReview(pending, { decision: 'auto', reviewer: 'x', notes: '' }), /approved or declined/);
  assert.throws(() => recordReview(pending, { decision: 'approved', reviewer: ' ', notes: '' }), /identification/);
  assert.throws(() => recordReview(pending, { decision: 'approved', reviewer: 'x', notes: 'x'.repeat(2001) }), /2000/);
});
