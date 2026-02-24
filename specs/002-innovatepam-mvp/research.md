# Research Notes

## Key Decisions

- Use Supabase Auth for authentication; avoid custom JWT issuance for MVP.
- Store role in profile metadata/table and enforce authorization with RLS + server checks.
- Use a single Next.js app with server routes to simplify deployment and reduce integration risk.

## Constraints

- Keep feature scope limited to sprint MVP requirements.
- One attachment per idea submission.
- Use managed Postgres and storage from Supabase.
