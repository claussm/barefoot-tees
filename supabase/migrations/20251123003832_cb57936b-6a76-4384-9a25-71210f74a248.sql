-- Create players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  handicap NUMERIC(4, 1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  course_name TEXT NOT NULL,
  first_tee_time TIME NOT NULL,
  tee_interval_minutes INTEGER NOT NULL DEFAULT 10,
  holes INTEGER NOT NULL DEFAULT 18 CHECK (holes IN (9, 18)),
  max_players INTEGER NOT NULL DEFAULT 40,
  slots_per_group INTEGER NOT NULL DEFAULT 4,
  signup_deadline TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_players table (attendance/intent)
CREATE TABLE public.event_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'playing', 'not_playing', 'waitlist')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tee_time TIME NOT NULL,
  group_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, group_index)
);

-- Create group_assignments table
CREATE TABLE public.group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, position),
  UNIQUE (group_id, player_id)
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for admin-only app (no auth required for MVP)
CREATE POLICY "Allow all operations on players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on event_players" ON public.event_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on group_assignments" ON public.group_assignments FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_players_is_active ON public.players(is_active);
CREATE INDEX idx_players_name ON public.players(name);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_event_players_event_id ON public.event_players(event_id);
CREATE INDEX idx_event_players_player_id ON public.event_players(player_id);
CREATE INDEX idx_event_players_status ON public.event_players(status);
CREATE INDEX idx_groups_event_id ON public.groups(event_id);
CREATE INDEX idx_group_assignments_group_id ON public.group_assignments(group_id);
CREATE INDEX idx_group_assignments_player_id ON public.group_assignments(player_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();