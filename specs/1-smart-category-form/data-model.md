# Data Model: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form  
**Date**: 2026-02-24

## Entity: Idea

Existing entity extended with category-specific payload.

- id: UUID (PK)
- user_id: UUID (FK -> user_profile.id)
- title: text (required)
- description: text (required)
- category: text (required; must match allowed categories)
- category_fields: jsonb (required, default `{}`) — only active category keys allowed
- status: text (`submitted | under_review | accepted | rejected`)
- attachment_url: text nullable
- evaluator_comment: text nullable
- created_at: timestamptz
- updated_at: timestamptz

Validation rules:
- `category` is required.
- `category_fields` must validate against selected category definition.
- Required dynamic fields must be present.
- Optional dynamic fields may be absent or empty.
- Numeric dynamic fields enforce basic format/range where defined.
- Inactive category keys are rejected/stripped at server boundary.

## Entity: Category Field Definition (application-level config)

Represents per-category dynamic field configuration used by UI rendering and validation.

- category_name: string (unique)
- fields: CategoryField[]

### Value Object: CategoryField

- field_key: string (unique within category)
- field_label: string
- field_type: `text | number | select | textarea`
- is_required: boolean
- options: string[] (required when `field_type=select`)
- min: number optional (for `number`)
- max: number optional (for `number`)
- pattern: string optional (for basic text format)

Validation rules:
- Field keys are stable identifiers used in `category_fields` JSON.
- Required fields cannot be empty.
- Number values must parse to numeric and satisfy min/max if present.

## Relationships

- One `Idea` belongs to exactly one category (`Idea.category`).
- One category has many configured `CategoryField` definitions (config object).
- One `Idea` stores many dynamic values in `Idea.category_fields`, keyed by active category `field_key`.

## State transitions

No new state machine transitions introduced by this feature; existing idea status lifecycle remains unchanged.
