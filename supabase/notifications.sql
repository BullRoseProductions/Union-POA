-- ============================================================
-- B4C · Notification foundation
-- Member per-category email preferences + a send/delivery log.
-- Member prefs are written only through a security-definer RPC
-- (so a member can change their own preferences and nothing else).
-- The serverless send function writes the log via the service role.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1) Per-member notification preferences -----------------------------
--    JSONB of { category: boolean }. Absent / true = opted-in;
--    an explicit false = opted-out of that (non-critical) category.
alter table members
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

-- 2) Safe self-service update (members change ONLY their own prefs) ---
create or replace function set_my_notification_prefs(p_prefs jsonb)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  update members
     set notification_prefs = coalesce(p_prefs, '{}'::jsonb)
   where id = my_member_id();
$$;

-- 3) Send / delivery log (audit + status) ----------------------------
create table if not exists notification_log (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references departments(id) on delete cascade,
  category        text not null,
  subject         text not null,
  body            text,
  sent_by         uuid references members(id) on delete set null,
  recipient_count int  not null default 0,
  sent_count      int  not null default 0,
  failed_count    int  not null default 0,
  test            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists notification_log_dept on notification_log(department_id);

-- Board/admin can read their association's send history.
-- Writes come from the serverless function via the service role (bypasses RLS),
-- so no client-side insert policy is granted.
alter table notification_log enable row level security;
drop policy if exists notiflog_read on notification_log;
create policy notiflog_read on notification_log for select
  using (department_id = my_department_id() and is_canmanage());
