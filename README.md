# B4C · POA Member Hub

A phone-formatted web app (runs in the browser on your computer, framed like a
phone) for a Police Officers' Association. It's founded on the **VFD pattern you
already trust**: multi-tenant by department, roles as an `access` array, and a
**meetings → agenda → filed minutes → action items** lifecycle where every status
change is **server-stamped, role-checked, RPC-only, and 0-row-guarded** — *proof,
not promises.*

## What's in here
- `src/` — the React/Vite phone app (Home · Meetings · Meeting detail · My Actions · Profile)
- `supabase/schema.sql` — tables, RLS, and the lifecycle RPCs. **Run once.**
- `supabase/seed.sql` — demo association + a real meeting so you can log in and see it.
- `api/draft-minutes.js` — optional "Draft with AI" endpoint (off until you add a key).

## Deploy in ~15 minutes

### 1 · Supabase
1. Create a project at supabase.com. Wait for it to finish provisioning.
2. **SQL Editor → New query →** paste all of `supabase/schema.sql` → **Run**.
   Then do the same with `supabase/causes.sql` (adds the editable Causes feature).
3. Open `supabase/seed.sql`, replace **you@example.com** (appears twice) with the
   email you'll sign in with, paste into a new query → **Run**.
   > Sign-in only works for an email that's on a roster. This seed puts yours there.
4. **Project Settings → API →** copy the **Project URL** and the **anon public** key.
5. **Authentication → Providers →** make sure **Email** is enabled (magic link is on by default).

### 2 · Vercel
1. Push this folder to a GitHub repo (or `vercel` from the CLI).
2. Import it at vercel.com. Framework preset auto-detects **Vite**.
3. **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
   - *(optional)* `ANTHROPIC_API_KEY` = enables the "Draft with AI" button
4. Deploy. Open the URL, enter your seeded email, click the login link it emails you.

> In Supabase **Authentication → URL Configuration**, add your Vercel URL to
> **Redirect URLs** so the magic link returns to the live site.

### Run it locally first (optional)
```bash
npm install
cp .env.example .env.local   # fill in the two VITE_ values
npm run dev
```

## What "founded in VFD" means here (so Claude Code can reconcile later)
The names and shapes match the fire build on purpose: `departments` (org_type
`fire|ems|poa`), `members.access text[]`, `my_department_id()` / `is_canmanage()`
chokepoints, identity bridged by `lower(email) = lower(auth.email())`, and
`complete_meeting` / `file_minutes` / `set_action_status` as SECURITY DEFINER,
server-stamped RPCs with 0-row guards. Minutes are **version-on-write**. Meetings
carry the **open → completed (14-day grace) → archived** lifecycle.

## Deliberately NOT in v1 (the honest edges)
- **AI drafting** is optional and stubbed to the real endpoint — it drafts, a human files.
- No dispatch, incidents, cases, or patient/LE-sensitive data. This is the
  association's governance layer, and it stops **before the call**.

## Multi-POA from day one (no rewiring per association)
Everything org-specific is **data**, isolated by `department_id` and enforced by
RLS — the app code never names a POA or its causes. Onboarding a new association is:
1. Insert a `departments` row for them (their name, `org_type='poa'`).
2. Insert one `members` row for their first admin (their email, `access` includes `Board`).
3. They sign in and fill in their own causes, meetings, and roster from the app.

Causes and their entries are fully editable in-app by the board (add / edit /
archive / delete). The example cause in `causes.sql` is just data — delete it, or
comment those lines out for a blank start.

## Architecture note — read before scaling
This ships as a **standalone** project (its own Supabase + Vercel) so you can
deploy today and put it in front of Fort Worth POA. It intentionally mirrors the
VFD schema so it can later either **merge into the main app behind an org_type
flag** or **stay separate** — that's still the open decision. Don't wire this to
the live VFD Supabase blindly; let Claude Code diff the real schema first.
