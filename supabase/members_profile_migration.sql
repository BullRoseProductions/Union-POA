-- members: columns the roster detail/edit + add-member flow write to.
-- Run this in the Supabase SQL editor before using Edit member / Add member,
-- otherwise the update/insert fails wholesale (PostgREST rejects the entire
-- statement if any referenced column is unknown).
--
-- dues_paid_through / member_since are already read in the member profile view,
-- so they likely already exist; "if not exists" makes this safe to run as a whole.

alter table members add column if not exists phone             text;
alter table members add column if not exists dues_paid_through date;
alter table members add column if not exists member_since      date;
alter table members add column if not exists availability_note text;
alter table members add column if not exists preferred_contact text;
