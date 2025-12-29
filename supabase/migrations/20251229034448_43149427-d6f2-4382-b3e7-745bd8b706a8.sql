-- Add email column to players table
ALTER TABLE public.players ADD COLUMN email TEXT;

-- Add RSVP tracking columns to event_players table
ALTER TABLE public.event_players 
ADD COLUMN rsvp_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast token lookups
CREATE INDEX idx_event_players_rsvp_token ON public.event_players(rsvp_token);

-- Add RLS policy for public RSVP responses (allows updating via valid token)
CREATE POLICY "Anyone can update via rsvp_token" 
ON public.event_players 
FOR UPDATE 
TO anon
USING (rsvp_token IS NOT NULL)
WITH CHECK (rsvp_token IS NOT NULL);