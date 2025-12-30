-- Add email status tracking columns to event_players
ALTER TABLE public.event_players 
ADD COLUMN email_status text NOT NULL DEFAULT 'pending',
ADD COLUMN last_email_error text;

-- Add comment for clarity
COMMENT ON COLUMN public.event_players.email_status IS 'Status of email delivery: pending, sent, or failed';
COMMENT ON COLUMN public.event_players.last_email_error IS 'Error message if email delivery failed';

-- Enable realtime for event_players to support progress tracking
ALTER TABLE public.event_players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_players;