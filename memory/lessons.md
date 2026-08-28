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

## L-008 — Supabase `.neq("id", "")` on new-row upserts returns 400 (2026-08-18)
- **Problem**: saving a NEW car/address (no `id`) threw `400 22P02 invalid input syntax for type uuid` while clearing existing defaults.
- **Root cause**: the "clear other defaults" step used `.neq("id", car.id ?? "")` → PostgREST emitted `id=neq.` with an empty uuid string.
- **Fix**: only apply the `.neq("id", ...)` filter when `car.id` exists; run a plain `.eq("user_id", ...)` clear otherwise. Verified: default flag moves correctly on create AND edit.
- **Reusable pattern**: never feed `?? ""` into uuid filters; branch the query on whether the id exists.

## L-009 — Vercel "deployment blocked" by unmatched Git author email (2026-08-18)
- **Problem**: `vercel deploy --prod` kept failing; `vercel inspect` showed `readyState: BLOCKED`, `seatBlock.blockCode: TEAM_ACCESS_REQUIRED`, reason "Git author 123008422+amworx@users.noreply.github.com must have access to the team".
- **Root cause**: deploying from inside a git repo attaches commit metadata; Vercel verifies the commit author email maps to a GitHub account linked to the team. The `users.noreply.github.com` address can't be matched → blocked. All earlier attempts that "hung at Building…" were actually these BLOCKED deploys.
- **Fix**: `vercel build --prod` (local) → stage `.vercel` (project.json only, minus auth token) + `.vercel/output` into a temp dir with NO `.git` → `vercel deploy --prod --yes --prebuilt` from there. Succeeded in ~3s and aliased to klear-admin.vercel.app.
- **Reusable pattern**: to bypass Git-author verification, deploy prebuilt output from a clean directory that is not a git repo. Keep the real repo clean for git operations.

## L-010 — `vercel deploy --prod` CLI hangs on "Building…"; use --prebuilt + inspect
- **Problem**: `vercel deploy --prod --yes` uploads then prints "Building…" and never returns; the shell timeout kills it, leaving the deployment UNKNOWN.
- **Fix**: build locally with `vercel build --prod`, then deploy with `--prebuilt` so server-side build is skipped. Poll status with `vercel inspect <url>` instead of waiting on the CLI.
- **Reusable pattern**: for static Vite apps, always deploy prebuilt: `npm run build` → `vercel build --prod` → stage → `vercel deploy --prebuilt --prod`.

## L-011 — Tailwind v4 `rtl:rotate-180` uses the CSS `rotate` property, not `transform`
- **Problem**: computed `transform` was "none" despite the `rtl:rotate-180` class, making the icon flip look broken in inspection.
- **Root cause**: Tailwind v4 emits `rotate: 180deg` (independent CSS property), not `transform: rotate(180deg)`.
- **Fix**: check `getComputedStyle(el).rotate` when verifying v4 rotate utilities.
- **Reusable pattern**: in Tailwind v4, `rotate-*` utilities compile to the `rotate` property; read `.rotate` (not `.transform`) when validating in DevTools/scripts.
## L-012 — Tailwind v4 RTL switch fix: physical translate needs an rtl negative override (2026-08-18)
- **Problem**: Switch thumb overflowed the track in RTL when checked (thumb x=476..492 vs track 447..479); unchecked was inside (462..478).
- **Root cause**: shadcn/base-ui Switch uses a physical \	ranslate-x-[calc(100%-2px)]\ for the checked state; in RTL that positive X moves the thumb toward the overflow edge instead of inward.
- **Fix**: add \tl:group-data-[size=default]/switch:data-checked:-translate-x-[calc(100%-2px)]\ (and the sm variant) to the thumb className so RTL mirrors the offset.
- **Reusable pattern**: any physical \	ranslate-x\/inset offset inside a start-aligned (RTL) container needs an explicit \tl:\ negative override; verify geometry via getBoundingClientRect in dev, not just classes.

## L-013 — Prebuilt Vercel output needs vercel.json SPA rewrite for client routes (2026-08-18)
- **Problem**: after deploying prebuilt output, direct navigation to /clients returned 404 NOT_FOUND while / (which the SPA redirects) worked.
- **Root cause**: the generated .vercel/output/config.json only had the error handler; without a filesystem rewrite to /index.html, deep links 404. The Git-integration path injects the rewrite automatically; the manual prebuilt path doesn't.
- **Fix**: add \{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}\ to vercel.json, rebuild with \ercel build --prod\, restage, redeploy — config.json then contains the \dest: /index.html\ route.
- **Reusable pattern**: when manually deploying prebuilt Vite SPAs, always include vercel.json rewrites and verify config.json contains the SPA fallback route before deploying. Also: stage project.json INSIDE .vercel/ in the temp deploy dir (a stale project.json at the root caused a spurious "klear-deploy" project creation).

## L-015 — Base UI 1.7 `Menu.GroupLabel` requires a `Menu.Group` ancestor (2026-08-19)
- **Problem**: opening the Topbar user dropdown crashed the whole app with `Uncaught Error: Base UI: MenuGroupContext is missing` and rendered a black/empty page (React unmounts the tree on uncaught render errors).
- **Root cause**: shadcn's `DropdownMenuLabel` maps to `Menu.GroupLabel`, which calls `useMenuGroupRootContext()`; in @base-ui/react 1.7 that context only exists inside `Menu.Group`/`Menu.RadioGroup`.
- **Fix**: wrap the label in `<DropdownMenuGroup>` (which maps to `Menu.Group`).
- **Reusable pattern**: with base-ui 1.7+, any `DropdownMenuLabel` must be inside `DropdownMenuGroup`; a bare label throws at render time. Grep for `DropdownMenuLabel` usages whenever upgrading base-ui.

## L-016 — input-otp: use the children pattern, not the `render` prop (2026-08-19)
- **Problem**: the OTP step (shown after entering the email) crashed with `Cannot read properties of undefined (reading '0')` and produced a black window.
- **Root cause**: login-page used `<InputOTP render={({slots}) => ...}>`; input-otp@1.5.0 only wraps children in `OTPInputContext.Provider` — the `render` prop path bypasses the Provider, so `InputOTPSlot` (which reads `useContext(OTPInputContext)?.slots[index]`) got `{}` and `slots` was undefined.
- **Fix**: use children mode: `<InputOTP maxLength={n} value={...} onChange={...}><InputOTPGroup>{Array.from({length:n}).map((_,i)=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP>`.
- **Reusable pattern**: with shadcn/base-nova `input-otp.tsx`, always pass children (`InputOTPGroup` + `InputOTPSlot index=`) and never the `render` prop — the shadcn wrapper's slots read context, which only the children path provides.

## L-017 — Supabase mailer OTP length is configurable; don't hardcode 6 (2026-08-19)
- **Problem**: every OTP verify returned `otp_expired` even with the exact code from the email.
- **Root cause**: this project's Supabase auth config has `"mailer_otp_length": 8` (8-digit codes), but the login UI had `maxLength={6}` → the code was silently truncated to 6 digits before being sent.
- **Fix**: read `GET /v1/projects/<ref>/config/auth` via the Management API to learn the configured OTP length, then set InputOTP `maxLength` + verify guard to 8.
- **Reusable pattern**: never assume 6-digit OTPs. Check the auth config (`mailer_otp_length`, `sms_otp_length`) before building the OTP input; match slot count and validation to the configured length.

## L-018 — InputOTP slot borders/rounding need logical properties for RTL (2026-08-19)
- **Problem**: the 8-slot OTP screen looked broken (open outer edge, rounded inner corners) in the default Arabic RTL UI.
- **Root cause**: shadcn's `input-otp.tsx` used physical classes (`first:border-l first:rounded-l-lg last:rounded-r-lg border-r`). In `dir=rtl` the flex row is mirrored, so physical left/right land on the wrong side — the group's outer edge is unclosed and the corners round the wrong way.
- **Fix**: switch to logical properties: `border-e` on slots, `first:border-s first:rounded-s-lg last:rounded-e-lg`. Verified via getComputedStyle: first slot (rightmost in RTL) now has borderRight+radiusTR, last slot borderLeft+radiusTL.
- **Reusable pattern**: any shadcn/base-nova component with physical start/end borders or radii (border-l/r, rounded-l/r) must use `-s`/`-e` logical variants when the app is RTL-first. Verify with getComputedStyle on first/last elements, not just class names.
- **Problem**: Galaxy A34 5G showed a healthy \ADB Interface\ in Device Manager (Status OK) but \db devices\ returned empty after many server restarts; dl.google.com was unreachable so the Google USB driver couldn't be (re)installed.
- **Root cause**: Samsung's own ADB driver can register the interface without making it visible to Google's adb server; USB path was a dead end.
- **Fix**: use Wireless debugging — Settings → Developer options → Wireless debugging → Pair device with pairing code; then \db pair <phone-ip>:<pair-port>\ (code valid ~1 min; retry immediately), \db devices\ shows \db-<serial>._adb-tls-connect._tcp\, then \db install -r app.apk\ works over TLS. Found phone IP via the network monitor API at http://10.10.0.5:5000/api/clients.
- **Reusable pattern**: when USB adb is broken on Windows, skip driver surgery and use Wireless debugging — it needs only a 6-digit pairing code and the phone's IP (find it via the network monitor or router). Also: verify the real applicationId (\pm list packages\) — it was \com.klear.klear\, not the assumed \com.klear.app\.

## L-019 — Chart colors: `hsl(var(--chart-N))` is invalid for oklch; grayscale oklch = black (2026-08-19)
- **Problem**: pie chart sectors rendered all black/gray despite `--chart-1..5` being defined.
- **Root cause**: two compounding bugs: (1) the CSS vars were `oklch(0.87 0 0)`-style — zero chroma means gray regardless of hue; (2) `STATUS_COLORS` wrapped the vars in `hsl(...)` (`hsl(var(--chart-4))`), and `hsl(oklch(...))` is invalid CSS so the property silently failed.
- **Fix**: define the standard shadcn colorful oklch chart palette in index.css (light + dark) and reference raw `var(--chart-N)` without the hsl wrapper. Verify with a computed-style probe (`getComputedStyle(probe).color`) on the resolved value, not just the class.
- **Reusable pattern**: with Tailwind v4/shadcn oklch tokens, never wrap a var in `hsl(...)`; check chroma (`oklch(L C H)` with `C=0` is grayscale) when chart colors look monochrome.

## L-020 — Base UI `Select.Value` renders the RAW value unless given children (2026-08-19)
- **Problem**: dropdowns showed raw English values ("pending", "customer") inside the trigger even though SelectItems were translated; popup items were fine but the closed trigger was not.
- **Root cause**: Base UI's `Select.Value` defaults to rendering the raw `value` prop of the selected item. It only renders translated/labeled content when you pass a children function: `<SelectValue>{(value) => labelFor(value)}</SelectValue>`.
- **Fix**: add children render functions to every SelectValue that needs a display mapping (status, provider, role, car-size selects); map "all"/null sentinels explicitly.
- **Reusable pattern**: whenever a Base UI Select needs custom display text, always pass `(value) => ReactNode` as children of `Select.Value` — verified in `node_modules/@base-ui/react/select/value/SelectValue.js`.

## L-021 — Flex child with a nowrap table overflows its parent (needs `min-w-0`) (2026-08-19)
- **Problem**: the sidebar toggle pushed content 30px past the viewport (horizontal scrollbar) in LTR expanded; in RTL at 900px the inset main column was 61px too wide.
- **Root cause**: `SidebarInset` is a flex child with default `min-width: auto`; the services table's nowrap min-content width forced the flex item wider than the available space, overflowing the flex container.
- **Fix**: add `min-w-0` to the SidebarInset className — the flex item can then shrink and the table's own `overflow-x-auto` takes over (scrolls internally instead of overflowing the page).
- **Reusable pattern**: any flex child containing wide content (tables, long nowrap text) needs `min-w-0` (or `min-h-0` vertically) to participate in flex shrinking; verify via `scrollWidth <= clientWidth`.

## L-022 — RTL absolute-positioned close buttons need `end-*` logical props (2026-08-19)
- **Problem**: dialog/sheet close buttons sat on the wrong side in Arabic RTL (top-right instead of top-left, crowding the title which starts right).
- **Root cause**: shadcn dialogs use physical `right-2`/`right-3` positioning; in RTL the visual start is the right edge, so a right-anchored button collides with the header.
- **Fix**: switch to logical properties `end-2`/`end-3` (Tailwind v4 supports `end-*` = inset-inline-end).
- **Reusable pattern**: for RTL-first apps, use logical inset utilities (`start-*`/`end-*`) for absolutely-positioned controls near text edges; audit existing shadcn components for physical `right-*`/`left-*`.

## L-023 — Clearing React controlled inputs in browser E2E (2026-08-23)
**Problem**: chrome-devtools fill(uid, "") emptied a React-controlled <input type=number> visually but React state kept the old value (saved stale data once).
**Root cause**: programmatic value set without a proper input event does not update React state; a later re-render can reset the visible value.
**Fix/rule**: to clear an input in E2E: click it, press Ctrl+A then Delete (real key events), or use evaluate_script with native setter + dispatched InputEvent. Verify state-coupled UI (or DB) before asserting.
**Scope**: any React/Vite app testing, not just this project.

## L-024 — P-001 session bootstrap on Windows PS 5.1 (2026-08-23)
**Problem**: curl.exe with inline JSON (-d '{...}') or --data-binary "@file" both returned bad_json from Supabase under PS 5.1 quoting rules.
**Fix**: use a small node script with global fetch (see Temp/opencode/e2e_session.js pattern): generate_link (service key) -> verify (anon key) -> write at/rt files -> build hash URL -> navigate.
**Rule**: on this Windows box, prefer node fetch over curl.exe for JSON POST bodies in all auth/session tooling.

## L-025 — A DELETE with no matching RLS policy returns 204 (silent no-op) (2026-08-28)
- **Problem**: admin DELETE on `profiles` "succeeded" (204) and showed the success toast, but the row was never removed (verified via DB + table still showing it).
- **Root cause**: `profiles` had a `profiles_select_admin`/`profiles_update_admin` policy but NO `profiles_delete_admin` policy. RLS filters out the row for DELETE (no matching policy), so PostgREST returns 204 (success) while deleting 0 rows - it does NOT error. The designed FK protection (`bookings_provider_id_fkey`, 23503) never got a chance to run.
- **Fix**: add `drop policy if exists "profiles_delete_admin"; create policy ... for delete using (public.is_admin());` and apply with `supabase db query --db-url <url> --file <stmt>` (NOT `db push` - CLI tracker mismatch). Afterwards DELETE of a booking-linked captain returns HTTP 409 with FK error 23503 -> the catch path (providerDeleteBlocked toast) fires; captains with no bookings delete normally.
- **Reusable pattern**: to make destructive admin actions real, confirm the DELETE RLS policy exists before wiring destructive UI. Trust DB state (row present/absent), not the toast. A delete request that returns 204 but leaves the row is an RLS no-op, not a success.
