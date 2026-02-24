# Feature Specification: Smart Category-Based Submission Form

**Created**: 2026-02-24
**Status**: Draft
**Branch**: 1-smart-category-form

## Overview

This feature enhances the existing idea submission experience by showing additional, category-specific form fields after a user selects a category. The goal is to collect more relevant context per idea type while keeping submission on a single page with simple, clear validation.

## Problem Statement

The current submission form collects the same information for all idea categories, which leads to incomplete or low-quality submissions for category-specific reviews. Reviewers often lack critical details needed to evaluate ideas quickly, and submitters are not guided on what information matters most for each category.

## User Scenarios & Testing

### Primary Scenarios

#### S1: Category selection reveals relevant fields

**As** a submitter, **I want to** see fields that match my selected category **so that** I can provide the right details for my idea type.

- **Given** an authenticated submitter is on the idea submission form
- **When** they select a category
- **Then** the form displays that category’s additional fields on the same page

#### S2: Changing category updates visible fields

**As** a submitter, **I want to** have the form update when I switch categories **so that** I only see relevant questions.

- **Given** a submitter has selected one category and entered values into its additional fields
- **When** they change to a different category
- **Then** the form replaces previous category-specific fields with the new category’s fields and prevents irrelevant fields from being submitted

#### S3: Simple validation for required category fields

**As** a submitter, **I want to** receive clear validation feedback **so that** I can fix missing or invalid inputs quickly.

- **Given** a submitter completes the base form and category-specific fields
- **When** they submit with missing required values or invalid simple formats
- **Then** the form blocks submission and shows clear inline messages for each invalid field

#### S4: Successful submission from a dynamic form

**As** a submitter, **I want to** submit from the same form flow **so that** I can finish without navigating to extra pages.

- **Given** a submitter provides all required base and category-specific inputs
- **When** they submit the form
- **Then** the idea is saved successfully with both shared and category-specific data

### Edge Cases

- **EC1: No category selected** — If the user tries to submit without choosing a category, the form shows a required-field error for category.
- **EC2: Mid-entry category switch** — If the user changes category after entering category-specific values, only the active category’s fields are validated and submitted.
- **EC3: Empty optional category fields** — Optional category-specific fields may remain empty without blocking submission.
- **EC4: Invalid numeric input** — If a category-specific numeric field has invalid format or out-of-range value, submission is blocked with a field-level message.
- **EC5: Stale hidden values** — Hidden values from previously selected categories are not saved.

## Functional Requirements

### Dynamic Form Behavior

| ID    | Requirement | Acceptance Criteria |
| ----- | ----------- | ------------------- |
| FR-01 | The system shall present one submission page with base fields and category-specific fields that appear after category selection | Submitter stays on one form page while additional fields change based on selected category |
| FR-02 | The system shall maintain a predefined mapping of categories to additional fields | Each available category displays only its configured additional fields |
| FR-03 | The system shall update displayed additional fields immediately when category changes | Switching category replaces previous additional fields with the newly relevant fields |
| FR-04 | The system shall prevent inactive category fields from being included in the saved submission | Saved submission contains only base fields plus active category-specific fields |

### Validation

| ID    | Requirement | Acceptance Criteria |
| ----- | ----------- | ------------------- |
| FR-05 | The system shall apply simple validation rules for category-specific fields (required, basic format, basic numeric boundaries where defined) | Invalid category-specific inputs block submission and display field-level messages |
| FR-06 | The system shall validate only fields relevant to the currently selected category | Fields from non-selected categories do not trigger validation errors |
| FR-07 | The system shall display validation feedback inline and in plain language | Users can identify and fix each invalid field without leaving the page |

### Submission Integrity

| ID    | Requirement | Acceptance Criteria |
| ----- | ----------- | ------------------- |
| FR-08 | The system shall store category-specific values together with the idea submission | Reviewers can view category-specific details for submitted ideas |
| FR-09 | The system shall keep existing base submission rules unchanged unless explicitly category-dependent | Existing base validations and required base fields continue to work as before |

## Success Criteria

| ID   | Criterion | Measurement |
| ---- | --------- | ----------- |
| SC-1 | Submitters complete category-based submissions without extra navigation | 100% of test submissions complete on a single submission page |
| SC-2 | Dynamic fields match selected category consistently | In test runs, 100% of category selections show only relevant fields |
| SC-3 | Validation prevents incomplete category-specific submissions | In test runs, 100% of missing required category fields are blocked with clear messages |
| SC-4 | Form usability remains efficient | Median completion time for a valid submission remains under 3 minutes |
| SC-5 | Data quality improves for reviews | At least 90% of new submissions include all required category-specific details |

## Key Entities

### Idea Submission

- **idea_id**: Unique identifier for the idea
- **category**: Selected category value
- **base_fields**: Shared submission fields required for all categories
- **category_fields**: Additional values required or optional for the selected category
- **created_at**: Submission timestamp

### Category Field Definition

- **category_name**: Category label used by submitters
- **field_key**: Unique key for an additional field
- **field_label**: User-facing field name
- **field_type**: Input type (text, number, select, etc.)
- **is_required**: Whether the field must be provided for that category
- **validation_rule**: Simple rule set (required, basic format, basic range)

## Scope

### In Scope

- Dynamic additional fields on the existing submission form based on selected category
- Simple field validation for category-specific inputs
- Single-page submission flow with no additional pages
- Storage of category-specific submission data

### Out of Scope

- Multi-step form wizards or extra form pages
- Advanced conditional logic beyond category-based field sets
- Complex validation logic beyond simple required/format/range checks
- Changes to idea review workflow or status lifecycle

## Dependencies

- Existing idea submission flow and category list are available
- Existing authenticated submitter access to submission form remains unchanged
- Review experience can read and display saved category-specific details

## Assumptions

- Category-specific fields are defined for each existing category before release.
- Simple validation means required checks, basic text format checks, and basic numeric ranges where needed.
- The feature extends the current submission page; no new entry points are introduced.
- If a category is changed before submission, only the final selected category’s additional fields are persisted.
