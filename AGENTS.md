# klear-admin — Project AGENTS.md

Admin dashboard ("Klear Control Center") for the **Klear** on-demand mobile car
wash app. Separate React web app that manages the same Supabase project used by
the Flutter client (`../android/klear`).

Inherits the global doctrine (`~/.config/opencode/AGENTS.md`) — orchestrator,
memory system, UI Design Playbook. This file only adds project-specific rules.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 + shadcn/ui (base-nova style, lucide icons)
- @supabase/supabase-js (publishable anon key only — NEVER service_role)
- @tanstack/react-query (data fetching), @tanstack/react-table (tables)
- recharts (charts), react-router-dom (routing), date-fns
- Deploy: Vercel

## Security rules (hard)

1. **No service_role key in this codebase, ever.** All admin powers come from
   RLS policies using `is_admin()` on the `profiles` table. See
   `../android/klear/docs/ADR-0002-admin-dashboard.md`.
2. Secrets live only in `.env` (gitignored) / Vercel env vars. Never commit,
   never log, never render.
3. Role guard: every protected route checks the signed-in user's
   `profiles.role == 'admin'` before rendering.
4. Blocked users (`profiles.is_active = false`) must not be able to use the
   client app; the admin app must still be able to read their data.

## Key facts (from DB)

- booking_status enum: `pending | accepted | on_the_way | in_progress | completed | cancelled`
  (there is NO `confirmed` — PATCHing that value returns 400).
- `app_settings` is a single row (id=1):
  size_small_factor 1.0, size_medium_factor 1.25, size_large_factor 1.5,
  urgent_surcharge_pct 25, service_hours_start 08:00, service_hours_end 18:00,
  currency SYP.
- `profiles.is_active` gates user access (block = false).

## Commands

- `npm run dev` — local dev server (Vite)
- `npm run build` — typecheck + production build (gate)
- `npm run lint` — ESLint
- `npm run typecheck` — tsc --noEmit

## UI conventions

- RTL Arabic is the default UI language; English toggle supported.
- Dark mode toggle supported (next-themes).
- Follow the UI Design Playbook (`~/.config/opencode/ui-design.md`) for every
  screen: sidebar + topbar shell, stat cards, data tables, dialogs for edits.
- Use shadcn components only; no ad-hoc UI primitives.

## Memory discipline

Events/lessons/patterns/decisions/playbooks live in `memory/` (append-only).
Supabase credentials are recorded in `memory/credentials.md` (gitignored).