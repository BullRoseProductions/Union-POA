-- ai_outputs: columns needed for the Agenda & Minutes rebuild (edit/version support).
-- Run this in the Supabase SQL editor before using Edit-and-save on saved agendas/minutes.
-- deleted_at already exists in the live schema (used by listAIOutputs/deleteAIDraft) —
-- included here with "if not exists" so this file is safe to run as a whole.

alter table ai_outputs add column if not exists deleted_at   timestamptz;
alter table ai_outputs add column if not exists edited_at    timestamptz;
alter table ai_outputs add column if not exists edited_by    uuid references members(id);
alter table ai_outputs add column if not exists current_text text;
