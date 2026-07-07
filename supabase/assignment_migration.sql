-- =====================================================================
-- B4C · POA — assignment_migration.sql
-- Adds per-event attendance mode + member assignment
-- Safe to run after attendance.sql — fully additive
-- =====================================================================

-- attendance_mode on events: qr | manual | none
alter table events add column if not exists
  attendance_mode text not null default 'qr'
  check (attendance_mode in ('qr','manual','none'));

-- assign_all: true = whole roster, false = specific members only
alter table events add column if not exists
  assign_all boolean not null default true;

-- event_assignments: who's invited/expected when assign_all = false
create table if not exists event_assignments (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  event_id      uuid not null references events(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (event_id, member_id)
);
create index if not exists evassign_event  on event_assignments(event_id);
create index if not exists evassign_member on event_assignments(member_id);

alter table event_assignments enable row level security;

drop policy if exists evassign_read  on event_assignments;
create policy evassign_read on event_assignments for select
  using (department_id = my_department_id());

drop policy if exists evassign_write on event_assignments;
create policy evassign_write on event_assignments for all
  using  (department_id = my_department_id() and is_canmanage())
  with check (department_id = my_department_id() and is_canmanage());

-- update_event_assignments RPC — replaces the full assignment list atomically
-- Board calls this after picking members; 0-row-guarded, server-stamped
create or replace function update_event_assignments(
  p_event      uuid,
  p_assign_all boolean,
  p_member_ids uuid[]
) returns void
  language plpgsql security definer set search_path = public as $$
declare dept uuid;
begin
  if not is_canmanage() then raise exception 'not authorized'; end if;
  select department_id into dept from events
   where id = p_event and department_id = my_department_id();
  if dept is null then raise exception 'event not found'; end if;

  -- update the flag
  update events set assign_all = p_assign_all where id = p_event;

  -- replace assignments atomically
  delete from event_assignments where event_id = p_event;
  if not p_assign_all and array_length(p_member_ids, 1) > 0 then
    insert into event_assignments (department_id, event_id, member_id)
    select dept, p_event, unnest(p_member_ids);
  end if;
end $$;

grant execute on function update_event_assignments(uuid, boolean, uuid[]) to authenticated;
