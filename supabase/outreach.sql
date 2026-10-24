-- ============================================================
-- B4C · Community Outreach
-- Outreach events with per-event sign-up style (RSVP / roles / shifts)
-- plus a donation "needs" list members can claim from.
-- Department-scoped; RLS mirrors the causes/stipend pattern.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1) Outreach events --------------------------------------------------
create table if not exists outreach_events (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  title         text not null,
  description   text,
  location      text,
  event_date    date,
  start_time    time,
  signup_mode   text not null default 'rsvp'
                 check (signup_mode in ('rsvp','roles','shifts')),
  status        text not null default 'upcoming'
                 check (status in ('upcoming','completed','archived')),
  created_by    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists outreach_events_dept on outreach_events(department_id);

-- 2) Slots — a "role" (label + optional capacity) or a "shift"
--    (label + start/end time + capacity). RSVP events have no slots.
create table if not exists outreach_slots (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references outreach_events(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  label         text not null,
  start_time    time,
  end_time      time,
  capacity      int,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists outreach_slots_event on outreach_slots(event_id);

-- 3) Sign-ups — slot_id null = a simple RSVP ("I'll be there") --------
create table if not exists outreach_signups (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references outreach_events(id) on delete cascade,
  slot_id       uuid references outreach_slots(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists outreach_signups_event on outreach_signups(event_id);
-- one sign-up per member per slot (treats RSVP as a single null-slot)
create unique index if not exists outreach_signups_unique
  on outreach_signups(event_id, member_id,
      coalesce(slot_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4) Donation needs ("50 toys ages 5-8", "gift wrap") ----------------
create table if not exists outreach_needs (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references outreach_events(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  item          text not null,
  qty_needed    int not null default 1,
  unit          text,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists outreach_needs_event on outreach_needs(event_id);

-- 5) Donation claims — who's bringing what, how many -----------------
create table if not exists outreach_claims (
  id            uuid primary key default gen_random_uuid(),
  need_id       uuid not null references outreach_needs(id) on delete cascade,
  event_id      uuid not null references outreach_events(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  qty           int not null default 1 check (qty > 0),
  created_at    timestamptz not null default now()
);
create index if not exists outreach_claims_need on outreach_claims(need_id);

-- ============================================================
-- ROW LEVEL SECURITY
--   read  : anyone in the department
--   events/slots/needs : board/admin only (is_canmanage())
--   signups/claims     : a member manages their OWN; board/admin any
-- ============================================================
alter table outreach_events  enable row level security;
alter table outreach_slots   enable row level security;
alter table outreach_signups enable row level security;
alter table outreach_needs   enable row level security;
alter table outreach_claims  enable row level security;

-- reads
drop policy if exists oevents_read  on outreach_events;
create policy oevents_read  on outreach_events  for select using (department_id = my_department_id());
drop policy if exists oslots_read   on outreach_slots;
create policy oslots_read   on outreach_slots   for select using (department_id = my_department_id());
drop policy if exists osignups_read on outreach_signups;
create policy osignups_read on outreach_signups for select using (department_id = my_department_id());
drop policy if exists oneeds_read   on outreach_needs;
create policy oneeds_read   on outreach_needs   for select using (department_id = my_department_id());
drop policy if exists oclaims_read  on outreach_claims;
create policy oclaims_read  on outreach_claims  for select using (department_id = my_department_id());

-- manager writes (events, slots, needs)
drop policy if exists oevents_write on outreach_events;
create policy oevents_write on outreach_events for all
  using      (department_id = my_department_id() and is_canmanage())
  with check (department_id = my_department_id() and is_canmanage());
drop policy if exists oslots_write on outreach_slots;
create policy oslots_write on outreach_slots for all
  using      (department_id = my_department_id() and is_canmanage())
  with check (department_id = my_department_id() and is_canmanage());
drop policy if exists oneeds_write on outreach_needs;
create policy oneeds_write on outreach_needs for all
  using      (department_id = my_department_id() and is_canmanage())
  with check (department_id = my_department_id() and is_canmanage());

-- member-owned writes (sign-ups, claims) — members manage their own,
-- managers can adjust any (for roster corrections)
drop policy if exists osignups_write on outreach_signups;
create policy osignups_write on outreach_signups for all
  using      (department_id = my_department_id() and (member_id = my_member_id() or is_canmanage()))
  with check (department_id = my_department_id() and (member_id = my_member_id() or is_canmanage()));
drop policy if exists oclaims_write on outreach_claims;
create policy oclaims_write on outreach_claims for all
  using      (department_id = my_department_id() and (member_id = my_member_id() or is_canmanage()))
  with check (department_id = my_department_id() and (member_id = my_member_id() or is_canmanage()));
