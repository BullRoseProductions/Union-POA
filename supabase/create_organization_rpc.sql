-- create_organization: atomic org provisioning for Project Admins.
-- PAAddOrg.doCreate calls this instead of doing sequential client-side inserts
-- (which RLS blocks and which can leave orphaned departments on partial failure).
-- SECURITY DEFINER so it can write across departments; authorizes the caller as
-- a ProjectAdmin first. Members bridge by email at first login (current_member()).

create or replace function create_organization(
  org_name        text,
  org_short_name  text,
  org_type        text,
  admin_email     text,
  admin_name      text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_dept uuid;
begin
  -- Only ProjectAdmins may create organizations
  if not coalesce(
    (select access && array['ProjectAdmin']::text[] from members where id = my_member_id()),
    false
  ) then
    raise exception 'Only Project Admins can create organizations';
  end if;

  -- 1. Department (org_type CHECK allows fire/ems/poa)
  insert into departments (name, org_type)
  values (org_name, org_type)
  returning id into new_dept;

  -- 2. Seed org settings
  insert into org_settings (department_id, key, value) values
    (new_dept, 'org_name',       org_name),
    (new_dept, 'org_short_name', org_short_name);

  -- 3. First admin member (linked to their auth user by email on first login)
  insert into members (department_id, email, full_name, access, status, standing)
  values (
    new_dept,
    lower(admin_email),
    coalesce(nullif(admin_name, ''), 'Admin'),
    array['DeptAdmin','Board','Member']::text[],
    'active',
    'Good'
  );

  return new_dept;
end;
$$;

grant execute on function create_organization(text, text, text, text, text) to authenticated;
