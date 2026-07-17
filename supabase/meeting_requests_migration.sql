-- Meeting-request wiring (Steps 1–3 of the profile/who-to-call/correspondence work).
-- RUN THIS BEFORE using contact editing or the "Request a meeting" flow.
--
-- contacts.member_id: links a Who-to-Call contact to a real member so meeting
--   requests can be routed and availability pulled from that member's profile.
--   REQUIRED: the contact save now always writes member_id, so without this
--   column EVERY contact add/edit fails, not just the meeting feature.
alter table contacts add column if not exists member_id uuid references members(id);

-- correspondence.assigned_to: the board member a meeting request is routed to.
alter table correspondence add column if not exists assigned_to uuid references members(id);

-- Allow the new kind/status values on correspondence. If your correspondence
-- table has CHECK constraints on kind/status that exclude these, the inserts
-- fail. Find them with:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'correspondence'::regclass and contype = 'c';
-- then, once you know the constraint name, adjust (example):
-- alter table correspondence drop constraint if exists correspondence_kind_check;
-- alter table correspondence add constraint correspondence_kind_check
--   check (kind in ('announcement','message','reply','alert','meeting_request'));
