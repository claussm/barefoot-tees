-- Drop the current permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view players" ON public.players;

-- Create policy for admins to view full player data (including phone)
CREATE POLICY "Admins can view all player details" 
ON public.players 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create a view without sensitive PII for non-admin users
CREATE OR REPLACE VIEW public.players_public 
WITH (security_invoker = false)
AS SELECT 
  id,
  name,
  is_active,
  handicap,
  tee_box_id,
  default_team_id,
  created_at,
  updated_at
FROM public.players;

-- Grant access to authenticated users on the view
GRANT SELECT ON public.players_public TO authenticated;