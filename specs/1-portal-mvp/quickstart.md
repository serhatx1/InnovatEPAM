# Quickstart: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

## Prerequisites

- Node.js 20+
- A Supabase project with Auth, Database, and Storage enabled
- Environment variables configured (see below)

## Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Install Dependencies

```bash
npm install
```

## Database Setup

Run the migration against your Supabase project:

```bash
# Via Supabase CLI (if linked)
npx supabase db push

# Or manually execute supabase/migrations/001_create_schema.sql
# in the Supabase SQL Editor
```

After the RLS fix (R7 from research), also run migration 002:

```bash
# supabase/migrations/002_fix_idea_visibility.sql
# Replaces per-user idea read policies with authenticated-user read policy
```

## Create an Admin User

1. Register a new user through the portal UI at `/auth/register`
2. In the Supabase Dashboard SQL Editor, promote the user to admin:

```sql
UPDATE public.user_profile
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch
```

## Key Routes

| Route                | Description                      | Auth Required | Role     |
| -------------------- | -------------------------------- | ------------- | -------- |
| `/`                  | Home page with navigation links  | No            | Any      |
| `/auth/register`     | User registration                | No            | —        |
| `/auth/login`        | User login                       | No            | —        |
| `/auth/logout`       | User logout                      | Yes           | Any      |
| `/ideas`             | Idea listing (all ideas)         | Yes           | Any      |
| `/ideas/new`         | Submit a new idea                | Yes           | Any      |
| `/ideas/:id`         | Idea detail view                 | Yes           | Any      |
| `/admin/review`      | Admin review dashboard           | Yes           | Admin    |

## API Endpoints

| Method | Endpoint                            | Description              |
| ------ | ----------------------------------- | ------------------------ |
| GET    | `/api/ideas`                        | List all ideas           |
| POST   | `/api/ideas`                        | Create a new idea        |
| GET    | `/api/ideas/:id`                    | Get idea details         |
| PATCH  | `/api/admin/ideas/:id/status`       | Update idea status       |

See [contracts/api.md](contracts/api.md) for full API documentation.

## Implementation Gaps to Address

Based on research findings, these gaps need to be resolved during implementation:

1. **R1**: Tighten Zod validation to match spec constraints (title 5–100, description 20–1000)
2. **R2**: Add server-side file type/size validation
3. **R3**: Enforce status transition rules in PATCH handler
4. **R4**: Enforce 10-char minimum for rejection comments
5. **R5**: Standardize category list to shared constants
6. **R7**: Fix RLS policies so all authenticated users can see all ideas
