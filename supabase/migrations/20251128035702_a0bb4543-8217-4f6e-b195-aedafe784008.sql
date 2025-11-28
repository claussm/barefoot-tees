-- Add phone field back to players table
ALTER TABLE public.players ADD COLUMN phone text;

-- Add rsvp_sent_at to event_players to track when RSVP was sent
ALTER TABLE public.event_players ADD COLUMN rsvp_sent_at timestamp with time zone;

-- Create table to track scheduled RSVP sends
CREATE TABLE public.rsvp_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS on rsvp_schedules
ALTER TABLE public.rsvp_schedules ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage RSVP schedules
CREATE POLICY "Admins can manage rsvp_schedules"
ON public.rsvp_schedules
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));