# Quickstart: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp

## Prerequisites

- **Node.js** ≥ 20 (LTS)
- **pnpm** (or npm/yarn — scripts use npm by default)
- **Supabase CLI** (`npx supabase`) or a remote Supabase project
- Git

## 1. Clone & Install

```bash
git clone <repo-url> && cd final_project
npm install
```

## 2. Environment Variables

Create `.env.local` at project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> **Local dev**: If using Supabase CLI (`npx supabase start`), use the local URLs and keys printed by the CLI.

## 3. Database Setup

Apply the schema migration:

```bash
npx supabase db push          # remote project
# OR
npx supabase db reset         # local (applies all migrations fresh)
```

The migration at `supabase/migrations/001_create_schema.sql` creates:

- `user_profile` table (id, email, role, created_at)
- `idea` table (id, user_id, title, description, category, status, attachment_url, evaluator_comment, created_at, updated_at)
- RLS policies for authenticated access
- Storage bucket `idea-attachments` with upload/read policies
- Auth trigger to auto-create profile on signup

## 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Run Tests

```bash
# Unit tests only (no Supabase connection needed)
npx vitest run tests/unit

# All tests (requires .env.local with valid Supabase credentials)
npx vitest run
```

## 6. Typical Workflows

### Submit an Idea (Employee)

1. Register at `/auth/register` (role defaults to `submitter`)
2. After signup, open `/auth/verify-email` and confirm from your inbox link
3. Confirmation redirects to `/auth/confirmed`; continue to `/auth/login`
4. Navigate to `/ideas/new`
5. Fill title (5–100 chars), description (20–1000 chars), select category
6. Optionally attach a file (PDF/PNG/JPG/DOCX, max 5 MB)
7. Submit → redirects to `/ideas`

### Review an Idea (Admin)

1. Log in with an admin account (update role in `user_profile` table: `UPDATE user_profile SET role = 'admin' WHERE email = '...'`)
2. Navigate to `/admin/review`
3. Click "Start Review" on a submitted idea → status moves to `under_review`
4. Click "Approve" or "Reject" (rejection requires ≥10-char comment)

### View All Ideas (Any User)

1. Log in → navigate to `/ideas`
2. All ideas from all users are visible (FR-17)
3. Click any idea to see details at `/ideas/[id]`

## 7. Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── admin/review/       # Admin review dashboard
│   ├── api/ideas/          # CRUD API endpoints
│   ├── api/admin/ideas/    # Admin status-update endpoint
│   ├── auth/               # Login, register, logout pages
│   └── ideas/              # Idea listing, detail, submission pages
├── lib/
│   ├── constants.ts        # Shared constants (categories, file limits, transitions)
│   ├── auth/roles.ts       # getUserRole helper
│   ├── queries/            # Supabase query functions
│   ├── supabase/           # Supabase client/server/middleware/storage helpers
│   └── validation/         # Zod schemas (idea, status)
└── types/index.ts          # TypeScript type definitions
```
