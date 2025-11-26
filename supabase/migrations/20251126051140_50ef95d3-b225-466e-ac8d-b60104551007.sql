-- Add RSVP status field to event_players table
ALTER TABLE public.event_players
ADD COLUMN rsvp_status text CHECK (rsvp_status IN ('yes', 'no', 'maybe'));

-- Add index for better query performance on RSVP status
CREATE INDEX idx_event_players_rsvp_status ON public.event_players(rsvp_status);

COMMENT ON COLUMN public.event_players.rsvp_status IS 'Player RSVP response: yes, no, maybe, or null if not responded';