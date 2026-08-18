# Lessons — klear-admin

Append-only.

## L-001 — npm 12 EALLOWSCRIPTS breaks `npx shadcn@latest init/add` (2026-08-18)
- **Problem**: `npx shadcn@latest` fails with `EALLOWSCRIPTS` even with `allow-scripts=true` in project `.npmrc`.
- **Root cause**: npm 12's script-permission model + the shadcn CLI injecting `--allow-scripts` into project-scoped `npm install` invocations, which npm 12 rejects.
- **Fix**: invoke the locally installed CLI directly, bypassing the npx wrapper:
  `node node_modules/shadcn/dist/index.js add <component> --yes [--overwrite]`
- **Reusable pattern**: whenever a package manager wrapper (npx/npm exec) injects unsupported flags, run the installed JS entrypoint directly with node.

## L-002 — @supabase/auth-js v2.112 changed the localStorage session key
- **Problem**: injecting a session under the legacy key `sb-<project-ref>-auth-token` did NOT authenticate the app.
- **Root cause**: current auth-js stores the session under `supabase.auth.token` (raw session JSON) and the user under `supabase.auth.token-user` (`{ user: ... }`). Older docs/guides use the old `sb-*` key.
- **Fix**: set `supabase.auth.token` = raw session object, `supabase.auth.token-user` = `{ user: session.user }`.
- **Reusable pattern**: always grep `node_modules/@supabase/auth-js/dist/module/lib/constants.js` for `STORAGE_KEY` before hand-injecting sessions.

## L-003 — URL-hash session injection is the most reliable E2E auth path
- **Problem**: even with correct storage keys, `getSession()` on a pre-created client may return null after storage was mutated externally.
- **Root cause**: the client caches/revalidates in memory; external localStorage writes don't invalidate it.
- **Fix**: navigate to `/#access_token=...&refresh_token=...&expires_in=3600&expires_at=...&token_type=bearer&type=magiclink` — the client's `detectSessionInUrl: true` consumes it and persists the session; subsequent full reloads stay authenticated.
- **Reusable pattern**: for web E2E with Supabase, get tokens via service-role `/auth/v1/admin/generate_link` (curl with `-A "curl/8.5.0"`), exchange OTP at `/auth/v1/verify`, then drive the app through the hash URL instead of fighting storage.

## L-004 — Supabase rejects service-role key from browser User-Agents
- **Problem**: `sb_secret_...` requests failed when sent with a browser-like UA.
- **Fix**: use curl.exe with `-A "curl/8.5.0"` for admin/verification API calls. Never put the service key in app code.
- **Reusable pattern**: Supabase publishable/service key enforcement is UA-aware; keep service keys in curl-only tooling.

## L-005 — base-ui components use `render` prop, not `asChild`
- **Problem**: shadcn base-nova style components (Button, SidebarMenuButton, DropdownMenuTrigger) don't accept `asChild`.
- **Fix**: use the `render={<Link to="..." />}` prop pattern.
- **Reusable pattern**: when a shadcn component from base-ui complains about unknown `asChild`, switch to `render` prop with the element as JSX child of the prop.

## L-006 — UI Design Playbook compliance achieved with zero ad-hoc UI
- All screens use shadcn components only (table, dialog, alert-dialog, sheet, select, input-otp, sidebar, chart, sonner). No hand-rolled primitives.
- **Reusable pattern**: for admin dashboards, prefer the shadcn sidebar + topbar shell, StatCard/PageHeader utilities, and table+dialog CRUD layouts exactly as in this project's `src/components/layout/page-utils.tsx`.

## L-007 — Vercel deploy: link --repo alpha + GitHub connect can fail; direct deploy works
- **Problem**: `vercel link --repo` (alpha) found the project but selected none; `vercel git connect` failed "Failed to connect" — the Vercel GitHub App isn't installed for the amworx GitHub account.
- **Fix**: `vercel link --yes --scope <team>` created the project + `.vercel/project.json`; set env vars via `vercel env add NAME production/preview/development` (pipe value via stdin to avoid interactive prompt); `vercel deploy --yes` deployed to production (no --prod needed; deploy alias was production because project has no git prod branch configured — inspect output said "▲ Production").
- **Reusable pattern**: when git integration is unavailable, use `vercel link --yes` + `vercel env add` + `vercel deploy` directly. To enable git-push deploys later, install the Vercel GitHub App on the account and re-run `vercel git connect <repo-url>`.