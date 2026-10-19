/**
 * BEAST Family First - Core Rules & Scoring Engine
 * Version: 1.0
 * 
 * Purpose: Evaluates family needs assessments, calculates priority scores,
 * enforces safety guardrails, and routes requests to Human Review or Ledger Dispatch.
 */

const { randomUUID } = require('node:crypto');

// Weight Matrix for Systemic Stressors
const WEIGHTS = {
  IMMINENT_HOMELESSNESS: 40,
  DOMESTIC_VIOLENCE_RISK: 35,
  ACUTE_MENTAL_HEALTH_STRAIN: 25,
  SUBSTANCE_RECOVERY_SUPPORT: 20,
  FOOD_INSECURITY: 15,
  DEPENDENTS_MULTIPLIER: 5 // Per dependent child
};

// Priority Thresholds
const THRESHOLDS = {
  EMERGENCY: 75, // Immediate < 24hr intervention required
  URGENT: 45,    // < 48hr intervention required
  STANDARD: 0    // Standard queue processing
};

/**
 * Evaluates an incoming Family Intake payload.
 * 
 * @param {Object} intakePayload - The assessment data submitted by/for the family.
 * @returns {Object} Evaluation outcome with calculated score, priority level, and next workflow step.
 */
function evaluateIntake(intakePayload) {
  const {
    familyId,
    dependentsCount = 0,
    housingStatus, // 'housed', 'at_risk', 'homeless'
    domesticViolenceFlag = false,
    mentalHealthCrisisFlag = false,
    substanceSupportFlag = false,
    foodInsecure = false
  } = intakePayload;

  let totalScore = 0;
  const detectedRiskFactors = [];

  // 1. Evaluate Housing Stability
  if (housingStatus === 'homeless' || housingStatus === 'at_risk') {
    totalScore += WEIGHTS.IMMINENT_HOMELESSNESS;
    detectedRiskFactors.push('HOUSING_UNSTABLE');
  }

  // 2. Evaluate Domestic Safety
  if (domesticViolenceFlag) {
    totalScore += WEIGHTS.DOMESTIC_VIOLENCE_RISK;
    detectedRiskFactors.push('DOMESTIC_SAFETY_RISK');
  }

  // 3. Evaluate Mental Health Strain & Trauma Support
  if (mentalHealthCrisisFlag) {
    totalScore += WEIGHTS.ACUTE_MENTAL_HEALTH_STRAIN;
    detectedRiskFactors.push('ACUTE_MENTAL_HEALTH_STRAIN');
  }

  // 4. Evaluate Substance Recovery Pathways
  if (substanceSupportFlag) {
    totalScore += WEIGHTS.SUBSTANCE_RECOVERY_SUPPORT;
    detectedRiskFactors.push('SUBSTANCE_RECOVERY_NEEDED');
  }

  // 5. Food Insecurity & Dependents Multiplier
  if (foodInsecure) {
    totalScore += WEIGHTS.FOOD_INSECURITY;
    detectedRiskFactors.push('FOOD_INSECURITY');
  }
  
  const dependentBonus = Math.min(dependentsCount * WEIGHTS.DEPENDENTS_MULTIPLIER, 25);
  totalScore += dependentBonus;

  // Determine Priority Level
  let priorityLevel = 'STANDARD';
  if (totalScore >= THRESHOLDS.EMERGENCY) {
    priorityLevel = 'EMERGENCY';
  } else if (totalScore >= THRESHOLDS.URGENT) {
    priorityLevel = 'URGENT';
  }

  // Enforce Guiding Policy: AI cannot approve/deny benefits automatically.
  // AI assigns priority and routes to Human Reviewer with an audit payload.
  const evaluationResult = {
    assessmentId: randomUUID(),
    familyId,
    calculatedScore: totalScore,
    priorityLevel,
    riskFactors: detectedRiskFactors,
    requiresHumanReview: true, // Always true per AI_DECISION_SUPPORT_FRAMEWORK
    suggestedPathways: [
      ...(housingStatus !== 'housed' ? ['HOUSING_STABILIZATION_GRANT'] : []),
      ...(mentalHealthCrisisFlag ? ['TRAUMA_PREVENTION_PATHWAY'] : []),
      ...(foodInsecure ? ['COMMUNITY_FOOD_NETWORK'] : [])
    ],
    timestamp: new Date().toISOString()
  };

  return evaluationResult;
}

module.exports = {
  evaluateIntake,
  THRESHOLDS,
  WEIGHTS
};
