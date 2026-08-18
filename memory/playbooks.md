# Playbooks — klear-admin

Append-only. Reusable workflows. USE the existing playbook before creating a new one.

## PB-001 — project_initialize (Vite + shadcn + npm 12)
1. `npm create vite@latest <name> -- --template react-ts` (or accept the failed `npx shadcn init` that already created template files).
2. Create `.npmrc` with `allow-scripts=true` (npm 12 project-scoped).
3. `npm install`.
4. Run shadcn init via direct node: `node node_modules/shadcn/dist/index.js init --preset nova --yes --force` (never via npx).
5. Install app deps: `npm i @supabase/supabase-js @tanstack/react-query @tanstack/react-table recharts react-router-dom date-fns`.
6. `npm i -D shadcn` if init needs the CLI as a dev dep.
7. Gate: `npm run typecheck && npm run lint && npm run build`.

## PB-002 — task_create (feature)
1. Load project AGENTS.md + memory.
2. Check playbooks first.
3. Implement page under `src/pages/` using shared `page-utils.tsx` + shadcn components.
4. Add React Query hook to `src/lib/hooks/queries.ts`; register routes in `App.tsx`.
5. Verify via dev server + chrome-devtools.
6. Append event to `memory/events.md`.

## PB-003 — supabase_e2e_session (see pattern P-001)
Full steps in patterns.md P-001: generate_link (service key, curl UA) → verify (anon key) → navigate to app with `#access_token=...` hash. Never guess storage keys.

## PB-004 — deploy_vercel
1. `npm run build` green.
2. Push to GitHub `amworx/klear-admin` (main branch).
3. Ensure `.vercel/` link exists; if not: `vercel login` (device flow), `vercel link --yes --scope <team>`, `vercel deploy --yes`.
4. Set env vars in Vercel project: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (never service key) — pipe value via stdin to `vercel env add NAME <env>`.
5. Verify: open deployed URL → login → dashboard renders.
6. NOTE: no-auth deploy.sh fallback EXCLUDES `.env.*` so it cannot build this app (env vars required at build). Use real Vercel auth + env vars instead.
7. OPTIONAL git-push deploys: install Vercel GitHub App on the GitHub account, then `vercel git connect https://github.com/amworx/klear-admin`.

## PB-005 — task_complete (per milestone)
1. Gates green (typecheck/lint/build).
2. E2E each module in browser.
3. Update todo tracker.
4. Append events/lessons/patterns.
5. Commit + push (main).
6. Update container `C:\Users\HP\Documents\code_repo\AGENTS.md` project map.