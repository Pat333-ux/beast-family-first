'use strict';

const RESOURCE_OPTIONS = Object.freeze({
  housing: ['Rental assistance navigation', 'Emergency housing fund navigation', 'Legal aid referral'],
  food: ['SNAP enrollment navigation', 'Community pantry connection', 'Emergency grocery support'],
  utilities: ['Utility assistance navigation', 'Utility hardship program referral'],
  employment: ['Workforce program referral', 'Job placement navigation', 'Training program referral'],
  mentalHealth: ['Community support options', 'Counseling navigation', 'Immediate support network referral'],
  householdStress: ['Conflict-resolution resources', 'Family support navigation'],
  childWellbeing: ['Family preservation services', 'Child and caregiver support navigation']
});

function suggestResources(needs) {
  if (!Array.isArray(needs) || needs.some((need) => typeof need !== 'string')) {
    throw new TypeError('Needs must be an array of resource categories.');
  }

  const uniqueNeeds = [...new Set(needs)];
  const unknownNeeds = uniqueNeeds.filter((need) => !Object.hasOwn(RESOURCE_OPTIONS, need));
  if (unknownNeeds.length > 0) {
    throw new RangeError(`Unsupported need categories: ${unknownNeeds.join(', ')}.`);
  }

  return uniqueNeeds.flatMap((need) =>
    RESOURCE_OPTIONS[need].map((resource) => ({ need, resource, status: 'suggested' }))
  );
}

module.exports = { suggestResources, RESOURCE_OPTIONS };
