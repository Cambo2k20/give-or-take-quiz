-- The compatibility client ships before these enum labels reach production.
-- Keep this migration enum-only: PostgreSQL enum values must be committed
-- before a later migration can use them in rows and function bodies.

alter type public.question_category add value if not exists 'dinosaurs';
alter type public.question_category add value if not exists 'games';

alter type public.game_mode add value if not exists 'dinosaurs';
alter type public.game_mode add value if not exists 'games';
