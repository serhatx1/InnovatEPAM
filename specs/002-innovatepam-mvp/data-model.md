# Data Model

## UserProfile

- `id` (uuid, PK, references auth.users.id)
- `email` (text)
- `role` (enum: submitter, admin)
- `created_at` (timestamp)

## Idea

- `id` (uuid, PK)
- `user_id` (uuid, FK -> user_profile.id)
- `title` (text, required)
- `description` (text, required)
- `category` (text, required)
- `status` (enum: submitted, under_review, accepted, rejected)
- `attachment_url` (text, nullable)
- `evaluator_comment` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Rules

- New ideas default to `submitted`.
- `evaluator_comment` required on `rejected` transition.
- Submitter can manage/view own ideas.
- Admin can review and update all ideas.
