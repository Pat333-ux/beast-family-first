BEAST FAMILY FIRST DATABASE SCHEMA
Purpose
This document defines the production database structure for the BEAST Family First Government Platform.

Families Table
Table: families

Description: Stores household information.

Columns:

id UUID PRIMARY KEY

created_at TIMESTAMP

updated_at TIMESTAMP

head_of_household VARCHAR(255)

household_size INTEGER

county VARCHAR(255)

state VARCHAR(100)

status VARCHAR(50)

Cases Table
Table: cases

Description: Tracks all assistance requests.

Columns:

id UUID PRIMARY KEY

family_id UUID

status VARCHAR(50)

priority VARCHAR(50)

opened_at TIMESTAMP

closed_at TIMESTAMP

assigned_worker UUID

notes TEXT

FOREIGN KEY (family_id) REFERENCES families(id)

Assessments Table
Table: assessments

Description: Stores assessment scores.

Columns:

id UUID PRIMARY KEY

case_id UUID

housing_score INTEGER

food_score INTEGER

employment_score INTEGER

mental_health_score INTEGER

household_stress_score INTEGER

child_wellbeing_score INTEGER

total_score INTEGER

priority_level VARCHAR(50)

assessment_date TIMESTAMP

FOREIGN KEY (case_id) REFERENCES cases(id)

Resource Assignments Table
Table: resource_assignments

Description: Stores assigned services.

Columns:

id UUID PRIMARY KEY

case_id UUID

resource_type VARCHAR(255)

resource_name VARCHAR(255)

status VARCHAR(50)

assigned_at TIMESTAMP

completed_at TIMESTAMP

FOREIGN KEY (case_id) REFERENCES cases(id)

Reviews Table
Table: reviews

Description: Human review actions.

Columns:

id UUID PRIMARY KEY

case_id UUID

reviewer_id UUID

decision VARCHAR(50)

notes TEXT

reviewed_at TIMESTAMP

FOREIGN KEY (case_id) REFERENCES cases(id)

Users Table
Table: users

Description: System users.

Columns:

id UUID PRIMARY KEY

email VARCHAR(255)

password_hash TEXT

role VARCHAR(50)

created_at TIMESTAMP

active BOOLEAN

Roles:

Citizen
CaseWorker
Supervisor
Administrator
Auditor
Audit Logs Table
Table: audit_logs

Description: Tracks all system actions.

Columns:

id UUID PRIMARY KEY

user_id UUID

action VARCHAR(255)

target_type VARCHAR(100)

target_id UUID

created_at TIMESTAMP

ip_address VARCHAR(100)

metadata JSON

Program Partners Table
Table: partners

Description: Community and government partners.

Columns:

id UUID PRIMARY KEY

organization_name VARCHAR(255)

partner_type VARCHAR(100)

contact_name VARCHAR(255)

contact_email VARCHAR(255)

status VARCHAR(50)

Metrics Table
Table: metrics

Description: Platform-wide reporting metrics.

Columns:

id UUID PRIMARY KEY

metric_name VARCHAR(255)

metric_value NUMERIC

recorded_at TIMESTAMP

Future Tables
predictions

grant_matches

agency_integrations

notifications

document_uploads

messaging_threads

workflow_events

Database Standards
Requirements:

PostgreSQL
UUID Primary Keys
Foreign Key Enforcement
Audit Logging
Transaction Support
Daily Backup Capability
Encryption At Rest
Production Goal
Every family interaction, assessment, routing decision, review, resource assignment, and closure action

must be traceable through audit_logs for accountability, transparency, and compliance.

Project: BEAST Family First Government Platform

Version: 1.0
