# InnovatEPAM Portal

An internal employee innovation management platform where submitters propose ideas with file attachments and admins evaluate them through a structured review workflow.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel

## Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/serhatx1/InnovatEPAM.git
cd InnovatEPAM
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is required for some integration test scenarios.

### 3. Apply database migrations

Using Supabase CLI (recommended):

```bash
npx supabase db push
```

Or run SQL files manually in order via Supabase SQL Editor:

```
supabase/migrations/001_create_schema.sql
supabase/migrations/002_fix_rls_policies.sql
```

This creates:
- `user_profile` table with RLS
- `idea` table with RLS
- `idea-attachments` storage bucket
- Auto-profile-creation trigger on sign-up
- `updated_at` trigger for ideas
- RLS policy fixes for idea visibility and admin policy checks

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
# Unit tests
npx vitest run tests/unit

# Full test suite
npm test
```

Optional checks:

```bash
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── admin/review/      # Admin review dashboard
│   ├── api/
│   │   ├── ideas/          # POST/GET ideas
│   │   └── admin/ideas/    # PATCH /api/admin/ideas/[id]/status (admin)
│   ├── auth/               # Login, Register, Logout
│   ├── ideas/              # List, Detail, New Idea
│   └── layout.tsx
├── lib/
│   ├── auth/roles.ts       # Role constants & helpers
│   ├── supabase/           # Client, Server, Middleware, Storage
│   └── validation/idea.ts  # Zod schema
├── types/index.ts          # Shared TypeScript types
tests/
├── unit/                   # Validation, roles, types tests
└── integration/            # API route smoke tests
```

## MVP Features

| Feature | Status |
|---------|--------|
| User registration & login | ✅ |
| Role distinction (submitter vs admin) | ✅ |
| Route protection middleware | ✅ |
| Idea submission form (title, description, category) | ✅ |
| Single file attachment per idea | ✅ |
| Idea listing & detail views | ✅ |
| Admin review dashboard | ✅ |
| Accept / Reject with comments | ✅ |
| Reject requires comment rule | ✅ |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ideas` | List all ideas for authenticated users |
| POST | `/api/ideas` | Create idea (multipart/form-data) |
| GET | `/api/ideas/[id]` | Get idea detail |
| PATCH | `/api/admin/ideas/[id]/status` | Update idea status (admin only) |

## Architecture Decisions

See [docs/adr/](docs/adr/) for recorded ADRs:
- ADR-001: Next.js App Router
- ADR-002: Supabase Auth & Storage
- ADR-003: Testing Strategy

---

**Author**: Serhat Arslan
**Course**: A201 – Beyond Vibe Coding
