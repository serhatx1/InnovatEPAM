# EPIC-02 Tasks: Idea Submission & Discovery

**Source of truth**: `../tasks.md` (master sequence for Speckit)

## Setup / Foundation Dependencies (Phases 1-2)

- [X] T001 Initialize Next.js app and dependencies in `package.json`
- [X] T002 Configure environment variables and Supabase clients in `src/lib/supabase/`
- [X] T003 [P] Create base app route structure in `src/app/`
- [ ] T004 Create DB schema for profiles and ideas (Supabase SQL migration)
- [X] T006 [P] Configure input validation schemas in `src/lib/validation/`

## User Story 2 - Submit Innovation Ideas (Phase 4)

- [X] T010 [US2] Build submit form page in `src/app/ideas/new/page.tsx`
- [ ] T011 [US2] Implement file upload to Supabase Storage in `src/lib/supabase/storage.ts`
- [ ] T012 [US2] Implement idea creation endpoint in `src/app/api/ideas/route.ts`
- [ ] T013 [US2] Implement idea list/detail pages in `src/app/ideas/`

## Notes

- Keep task IDs and status synced with `../tasks.md`.
