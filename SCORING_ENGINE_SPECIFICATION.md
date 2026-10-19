# BEAST FAMILY FIRST SCORING ENGINE SPECIFICATION

## Purpose

The Scoring Engine calculates the Family Stability Score used to determine risk, prioritization, routing, and intervention levels.

The system must remain:

- Explainable
- Auditable
- Transparent
- Human Reviewable

---

# Stability Score Model

Scale:

0 - 100

Higher scores indicate greater family stability.

Lower scores indicate elevated intervention needs.

---

# Scoring Categories

Housing Stability

Weight: 15%

Examples:

100 = Stable Housing

75 = Temporary Housing Risk

50 = Behind On Housing Payments

25 = Eviction Pending

0 = Homeless

---

Food Security

Weight: 10%

Examples:

100 = Fully Food Secure

75 = Occasional Assistance Needed

50 = Frequent Assistance Needed

25 = Severe Food Insecurity

0 = Emergency Food Crisis

---

Employment Stability

Weight: 20%

Examples:

100 = Full Stable Employment

75 = Part-Time Employment

50 = Reduced Hours

25 = Recently Unemployed

0 = No Income Source

---

Mental Health Stability

Weight: 20%

Examples:

100 = Stable

75 = Mild Stress

50 = Moderate Stress

25 = Severe Distress

0 = Immediate Crisis

---

Household Stress

Weight: 15%

Examples:

100 = Low Stress

75 = Manageable Stress

50 = Elevated Stress

25 = Significant Conflict

0 = Crisis Conditions

---

Child Wellbeing

Weight: 20%

Examples:

100 = Stable Environment

75 = Minor Concerns

50 = Emerging Concerns

25 = Significant Risk

0 = Immediate Intervention Required

---

# Mathematical Formula

Final Score

Score =
(Housing × .15)
+
(Food × .10)
+
(Employment × .20)
+
(MentalHealth × .20)
+
(HouseholdStress × .15)
+
(ChildWellbeing × .20)

---

# Priority Bands

90–100

Stable

Action:

Monitoring Only

---

70–89

Preventive Support

Action:

Resource Recommendations

---

50–69

Elevated Risk

Action:

Case Worker Review

Resource Assignment

---

30–49

Crisis Intervention

Action:

Immediate Review

Priority Routing

---

0–29

Emergency Response

Action:

Emergency Escalation

Urgent Stabilization

---

# Risk Indicators

The following conditions increase intervention priority.

Housing Instability

Food Insecurity

Employment Loss

Mental Health Crisis

Domestic Conflict

Child Wellbeing Concerns

Utility Shutoff Risk

Transportation Barriers

Medical Hardship

---

# Escalation Rules

Rule 1

If Housing Score < 30

Then:

Emergency Housing Alert

---

Rule 2

If Food Score < 25

Then:

Emergency Food Assistance Alert

---

Rule 3

If Mental Health Score < 25

Then:

Immediate Mental Health Review

---

Rule 4

If Child Wellbeing Score < 25

Then:

Supervisor Escalation

---

# Intervention Multipliers

High Risk Categories receive additional weighting.

Example:

Housing Emergency

Multiplier:
1.5

Mental Health Crisis

Multiplier:
1.5

Child Safety Concern

Multiplier:
2.0

---

# Predictive Stability 
