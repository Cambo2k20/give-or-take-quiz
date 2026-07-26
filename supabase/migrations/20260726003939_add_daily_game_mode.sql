-- A daily round is its own mode: a fixed set of ten questions shared by every
-- player on a given calendar day.
--
-- This sits alone in its own migration on purpose. Postgres will not let a new
-- enum value be referenced in the transaction that adds it, and the constraints,
-- view and function that follow all name 'daily' directly.
alter type public.game_mode add value if not exists 'daily';
