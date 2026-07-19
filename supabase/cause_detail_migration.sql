-- Cause detail page: sponsor/partner contacts, cause-tied events, richer activity,
-- and next-event fields on causes. RUN BEFORE using the new cause detail view;
-- without these, Contacts/Events tabs stay empty and overview-save / activity-note fail.

-- Sponsors, partners, and key contacts per cause.
create table if not exists cause_contacts (
  id                 uuid primary key default gen_random_uuid(),
  cause_id           uuid not null references causes(id) on delete cascade,
  department_id      uuid not null references departments(id) on delete cascade,
  name               text not null,
  organization       text,
  role               text not null default 'Sponsor',
  phone              text,
  email              text,
  amount_committed   numeric,
  amount_received    numeric,
  last_contact_date  date,
  relationship_notes text,
  active             boolean not null default true,
  sort               int not null default 0,
  created_at         timestamptz not null default now()
);

-- Events tied to a cause (upcoming / completed / cancelled).
create table if not exists cause_events (
  id            uuid primary key default gen_random_uuid(),
  cause_id      uuid not null references causes(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  title         text not null,
  event_date    date,
  location      text,
  amount_raised numeric,
  notes         text,
  status        text not null default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  created_at    timestamptz not null default now()
);

-- New columns used by the detail view.
alter table cause_entries add column if not exists note text;
alter table causes add column if not exists next_event_date  date;
alter table causes add column if not exists next_event_notes text;

-- NOTE: RLS — add policies for cause_contacts and cause_events scoped to the
-- member's department (mirror the existing cause_entries policies), or board
-- users won't be able to read/insert rows even after the tables exist.
