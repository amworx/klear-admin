# Klear Control Center (klear-admin)

Admin dashboard for the **Klear** on-demand mobile car wash app (Flutter +
Supabase). Manages bookings, clients, services, pricing, providers, and
payments against the same Supabase project as the client app.

- **Stack:** React 19 · TypeScript · Vite 8 · Tailwind v4 · shadcn/ui · Supabase · TanStack Query/Table · Recharts
- **Auth:** Supabase email/OTP, admin role guarded via `profiles.role`
- **Deploy:** Vercel

## Local dev

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key
npm run dev            # http://localhost:5173
```

## Gates

```bash
npm run typecheck
npm run lint
npm run build
```

## Security

This app uses the **publishable anon key only**. Admin powers are enforced by
Supabase RLS (`is_admin()` policies). The service_role key is never used in
this codebase. See `../android/klear/docs/ADR-0002-admin-dashboard.md`.

## Docs

- `docs/` — architecture decisions, UI notes
- `plans/`, `tasks/` — milestone plans and task checklists
- `memory/` — events, lessons, patterns, decisions, playbooks (append-only)