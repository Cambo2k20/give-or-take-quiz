-- 'survival' joins the game_mode enum alone, exactly as 'daily' did: Postgres
-- will not let a new enum value be referenced in the transaction that adds it,
-- and the migration that follows names 'survival' in a constraint, a function
-- and a view. Do not merge this file into that one.
alter type public.game_mode add value if not exists 'survival';
