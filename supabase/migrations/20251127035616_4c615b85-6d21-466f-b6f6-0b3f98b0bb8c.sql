-- Remove phone and email columns from players table
ALTER TABLE public.players 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS email;