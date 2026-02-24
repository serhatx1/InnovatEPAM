# API Contract: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form  
**Date**: 2026-02-24

## Scope

This feature extends the existing idea submission API contract to include category-specific dynamic values while keeping existing base fields and routes.

## Endpoint

- Method: `POST`
- Path: `/api/ideas`
- Auth: Required (authenticated submitter)
- Content-Type: `multipart/form-data`

## Request Fields

Required base fields:
- `title`: string
- `description`: string
- `category`: string

Optional fields:
- `file`: binary file
- `category_fields`: JSON string object (`{"field_key":"value"...}`) representing only active category values

## Validation Contract

- `category` must be selected.
- `category_fields` must parse as a JSON object.
- Validation runs against selected category definition only.
- Required dynamic fields missing/empty -> `400` with field-level errors.
- Invalid number format or range -> `400` with field-level errors.
- Keys not defined for selected category -> rejected/ignored and never persisted.

## Success Response

- Status: `201 Created`
- Body: created idea record including `category` and persisted `category_fields` JSON.

Example:

```json
{
  "id": "uuid",
  "title": "Reduce vendor spend",
  "description": "...",
  "category": "Cost Reduction",
  "category_fields": {
    "cost_area": "Vendors",
    "estimated_savings": 1000
  }
}
```

## Error Response

- Status: `400 Bad Request` for validation errors
- Shape:

```json
{
  "error": "Validation failed",
  "details": {
    "category": ["Category is required"],
    "category_fields.estimated_savings": ["Must be a number between 0 and 1000000"]
  }
}
```

- Status: `401 Unauthorized` when user is not authenticated
- Status: `500` for unexpected server/storage failures

## Compatibility Notes

- Existing clients posting only base fields remain valid for categories with no additional required fields.
- Existing base validation rules remain unchanged.
- No new endpoints introduced; single-page submit flow preserved.
