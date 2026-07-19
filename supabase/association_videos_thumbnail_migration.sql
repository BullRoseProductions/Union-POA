-- Store the Vimeo thumbnail once (on add) so members don't re-fetch oEmbed each load.
-- Without this column the update in doAddVideo silently no-ops (Supabase resolves
-- errors rather than throwing), so videos still save — just without a cached thumb.
alter table association_videos add column if not exists thumbnail_url text;
