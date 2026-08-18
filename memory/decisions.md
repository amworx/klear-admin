# Decisions — klear-admin

Append-only. Mirror of ADRs in `../android/klear/docs/ADR-0002-admin-dashboard.md` + project-level choices.

## DEC-0001 — Separate React web app (klear-admin), not a Flutter web page
- **Status**: accepted (2026-08-18)
- **Context**: admin needs a fast, dashboard-grade UI; Flutter is optimized for mobile.
- **Decision**: standalone React + Vite + TS project at `code_repo/klear-admin`, own repo `amworx/klear-admin`, same Supabase project/auth.
- **Consequences**: shares DB + RLS; no Flutter changes except the pricing refactor (done in Phase A).

## DEC-0002 — Admin powers via RLS `is_admin()`, NEVER service_role key
- **Status**: accepted (hard rule, see AGENTS.md)
- **Decision**: browser uses only the publishable anon key; `is_admin()` RLS policies grant admin CRUD. Service key exists only in curl tooling / memory/credentials.md (gitignored).
- **Consequences**: safe even if the anon key leaks; no server needed.

## DEC-0003 — Auth via email OTP (magiclink)
- **Status**: accepted
- **Context**: consistent with client app DEC-0007; no passwords to manage.
- **Decision**: login page sends OTP to email, 6-digit input (shadcn InputOTP), `verifyOtp` with type `email`.

## DEC-0004 — shadcn base-nova preset
- **Status**: accepted
- **Decision**: `npx shadcn@latest init --preset nova` produced components.json style `base-nova`, lucide icons, baseColor neutral, Geist font. Uses base-ui primitives (render prop, not asChild).
- **Consequences**: follows UI Design Playbook; dark mode + RTL supported.

## DEC-0005 — Arabic RTL is the default UI language
- **Status**: accepted
- **Decision**: `index.html` lang=ar dir=rtl; i18n dictionary with ar default, en toggle persisted in localStorage (`klear-admin-lang`).
- **Consequences**: admin UI matches the product's primary market; EN available for foreign operators.

## DEC-0006 — Pricing settings editable from admin, reflected in client estimates
- **Status**: accepted (Phase A implemented client side)
- **Decision**: single-row `app_settings` (id=1) holds size factors, urgent surcharge %, service hours, currency. Admin edits it; Flutter client reads it with hardcoded fallbacks.
- **Consequences**: one source of truth for pricing; admin change is immediately visible to clients.

## DEC-0007 — Deploy target: Vercel (preview + git-integrated)
- **Status**: accepted; deploy pending Vercel auth
- **Decision**: Vite SPA on Vercel; env vars VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set in Vercel project (never committed).
- **Consequences**: see playbook P-Deploy-Vercel.