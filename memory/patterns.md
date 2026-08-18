# Patterns — klear-admin

Append-only. Reusable patterns extracted from successes.

## P-001 — Supabase web E2E session bootstrap (2026-08-18)
**When**: testing an authenticated web app against Supabase without access to the user's email inbox.
**Steps**:
1. `curl.exe -A "curl/8.5.0" -H "apikey: sb_secret_..." -H "Authorization: Bearer sb_secret_..." -X POST "<project>/auth/v1/admin/generate_link" -d '{"type":"magiclink","email":"..."}'` → returns `email_otp` + `action_link`.
2. `curl.exe -A "curl/8.5.0" -H "apikey: <anon>" -H "Content-Type: application/json" -X POST "<project>/auth/v1/verify" -d '{"type":"email","email":"...","token":"<email_otp>"}'` → returns access_token, refresh_token, expires_at.
3. Navigate the browser to `<app>/#access_token=<at>&refresh_token=<rt>&expires_in=3600&expires_at=<exp>&token_type=bearer&type=magiclink`.
4. Wait for redirect; app persists session; reload stays logged in.
**Why it works**: client's `detectSessionInUrl: true` consumes the hash; avoids storage-shape guessing entirely.

## P-002 — shadcn CLI invocation under npm 12 (Windows)
**When**: adding shadcn components in an npm-12 project where `npx shadcn` fails.
**Steps**:
```
node node_modules/shadcn/dist/index.js add <comp1> <comp2> --yes [--overwrite]
```
**Why**: direct node invocation avoids npx's injected `--allow-scripts` flag that npm 12 rejects in project-scoped installs.

## P-003 — Admin dashboard module layout
- Page structure: PageHeader (title + subtitle + action button) → stat cards row (StatCard) → data table (search + filter select + table) → dialogs for create/edit, alert-dialog for destructive confirm.
- Data: React Query hooks in `src/lib/hooks/queries.ts`; optimistic-ish updates via `queryClient.invalidateQueries`.
- Auth: AuthProvider reads session → fetch profile → `isAdmin` guard in ProtectedRoute → UnauthorizedPage for non-admins.
- i18n: dictionary object `src/lib/i18n.tsx`, `lang` state in localStorage, `dir`/`lang` on `<html>`, `formatCurrency`/`formatDateTime` helpers.
- Theme: next-themes ThemeProvider + shadcn sidebar/topbar.

## P-004 — Blocked-user data visibility (security)
Blocked users (`profiles.is_active = false`) must be visible to admin but gated from the client app. Admin RLS policies intentionally bypass `is_active` (is_admin() grants full select); client policies keep the gate. Keep this asymmetry explicit in queries and never mirror the client's user-gating in admin queries.