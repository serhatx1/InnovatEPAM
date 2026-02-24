# Quickstart: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form

## Goal

Verify dynamic category fields on existing submission page with simple validation and correct persistence.

## Prerequisites

- App running locally (`npm run dev`)
- Authenticated submitter session
- Existing categories available in form

## Scenario 1: Dynamic fields appear after category select

1. Open `/ideas/new`.
2. Fill base fields (`title`, `description`) and select a category.
3. Confirm category-specific fields appear on same page.
4. Change to a different category.
5. Confirm old category fields are replaced.

Expected:
- Only active category fields are visible.
- No navigation to a different page.

## Scenario 2: Required dynamic field validation

1. Select a category with required dynamic fields.
2. Leave one required dynamic field empty.
3. Submit.

Expected:
- Submission blocked.
- Inline plain-language error appears on missing field.

## Scenario 3: Numeric format/range validation

1. Enter invalid numeric value in a numeric dynamic field (e.g. text or out-of-range).
2. Submit.

Expected:
- Submission blocked with field-level numeric error.

## Scenario 4: Successful submit with dynamic fields

1. Fill base fields and all required dynamic fields.
2. Submit.

Expected:
- Request succeeds.
- New idea is created.
- Persisted record contains selected `category` and `category_fields` JSON for active category.

## Scenario 5: Stale hidden values are not persisted

1. Select category A and fill its dynamic fields.
2. Switch to category B.
3. Submit valid B data.
4. Inspect created idea payload/record.

Expected:
- Persisted `category_fields` includes only category B keys/values.
- Category A hidden values are absent.

## Suggested checks

- Run targeted tests for validation and API route behavior.
- Confirm existing base form validations still pass unchanged.

## Developer Notes (Config Maintenance)

- Category field definitions are maintained in `src/lib/constants.ts` under `CATEGORY_FIELD_DEFINITIONS`.
- Validation logic reuses `src/lib/validation/category-fields.ts`; update ranges/options there only through constants.
- Keep field keys stable; persisted `category_fields` JSON uses these keys directly.
- After changing definitions, rerun dynamic unit/integration tests to confirm category switch and stale-field filtering behavior.
