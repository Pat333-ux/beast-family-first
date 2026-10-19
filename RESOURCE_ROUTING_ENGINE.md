# BEAST FAMILY FIRST RESOURCE ROUTING ENGINE

## Purpose

The Resource Routing Engine converts Family Stability Assessments into actionable support pathways.

Its purpose is to ensure the right family receives the right assistance at the right time.

---

# Routing Philosophy

Assess
↓

Identify Need
↓

Match Resources
↓

Human Review
↓

Assign Support
↓

Track Outcomes

---

# Resource Categories

## Housing Stabilization

Services:

- Rental Assistance
- Eviction Prevention
- Utility Support
- Temporary Housing
- Emergency Shelter Navigation
- Housing Legal Aid

Trigger Conditions:

Housing Score < 70

Priority:

High

---

## Food Security

Services:

- SNAP Enrollment Assistance
- Emergency Food Support
- Pantry Referrals
- Community Meal Programs

Trigger Conditions:

Food Score < 70

Priority:

High

---

## Employment Recovery

Services:

- Workforce Development
- Job Placement Programs
- Resume Assistance
- Skills Training
- Career Counseling

Trigger Conditions:

Employment Score < 70

Priority:

Medium

---

## Mental Health Navigation

Services:

- Counseling Referrals
- Trauma Recovery Programs
- Peer Support Groups
- Crisis Intervention Resources

Trigger Conditions:

Mental Health Score < 70

Priority:

High

---

## Family Stabilization

Services:

- Family Preservation Programs
- Parenting Support
- Conflict Resolution Resources
- Caregiver Assistance

Trigger Conditions:

Household Stress Score < 70

Child Wellbeing Score < 70

Priority:

High

---

# Routing Rules

## Rule 1

IF Housing Score < 30

THEN

Assign:

- Emergency Housing
- Eviction Prevention
- Case Worker Escalation

Status:

URGENT

---

## Rule 2

IF Food Score < 25

THEN

Assign:

- Emergency Food Support
- SNAP Navigation

Status:

URGENT

---

## Rule 3

IF Employment Score < 40

THEN

Assign:

- Workforce Services
- Employment Counselor

Status:

PRIORITY

---

## Rule 4

IF Mental Health Score < 25

THEN

Assign:

- Immediate Review
- Crisis Support Resources

Status:

URGENT

---

## Rule 5

IF Child Wellbeing Score < 25

THEN

Assign:

- Supervisor Review
- Family Preservation Services

Status:

CRITICAL

---

# Multi-
