'use strict';

const DIMENSIONS = Object.freeze({
  housing: Object.freeze({ label: 'Housing stability', weight: 15 }),
  food: Object.freeze({ label: 'Food security', weight: 10 }),
  employment: Object.freeze({ label: 'Employment', weight: 20 }),
  mentalHealth: Object.freeze({ label: 'Mental health support', weight: 20 }),
  householdStress: Object.freeze({ label: 'Household stress', weight: 15 }),
  childWellbeing: Object.freeze({ label: 'Child wellbeing', weight: 20 })
});

const PRIORITY_BANDS = Object.freeze([
  { minimum: 90, label: 'Stable' },
  { minimum: 70, label: 'Preventive support' },
  { minimum: 50, label: 'Elevated risk' },
  { minimum: 30, label: 'Crisis intervention' },
  { minimum: 0, label: 'Emergency response' }
]);

function assessFamily(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    throw new TypeError('Scores must be an object.');
  }

  const expectedKeys = Object.keys(DIMENSIONS);
  const suppliedKeys = Object.keys(scores);
  if (
    suppliedKeys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(scores, key))
  ) {
    throw new TypeError(`Scores must include exactly: ${expectedKeys.join(', ')}.`);
  }

  let weightedScore = 0;
  for (const [key, dimension] of Object.entries(DIMENSIONS)) {
    const value = scores[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError(`${key} must be a number from 0 to 100.`);
    }
    weightedScore += value * dimension.weight;
  }

  const score = Math.round(weightedScore / 100);
  const priority = PRIORITY_BANDS.find((band) => score >= band.minimum);
  return {
    score,
    priority: priority.label,
    dimensions: Object.fromEntries(
      Object.entries(DIMENSIONS).map(([key, dimension]) => [
        key,
        { label: dimension.label, value: scores[key], weight: dimension.weight }
      ])
    )
  };
}

module.exports = { assessFamily, DIMENSIONS, PRIORITY_BANDS };
