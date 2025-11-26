-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'scorer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'scorer',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Update user_roles RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Drop existing permissive RLS policies and create new role-based ones

-- PLAYERS TABLE (Admin only for modifications, Scorers can read)
DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;

CREATE POLICY "Authenticated users can view players"
ON public.players FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can modify players"
ON public.players FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- EVENTS TABLE (Admin only for modifications, Scorers can read)
DROP POLICY IF EXISTS "Allow all operations on events" ON public.events;

CREATE POLICY "Authenticated users can view events"
ON public.events FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can modify events"
ON public.events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- EVENT_PLAYERS TABLE (Admin only for modifications, Scorers can read)
DROP POLICY IF EXISTS "Allow all operations on event_players" ON public.event_players;

CREATE POLICY "Authenticated users can view event_players"
ON public.event_players FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can modify event_players"
ON public.event_players FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PLAYER_TEAMS TABLE (Admin only)
DROP POLICY IF EXISTS "Allow all operations on player_teams" ON public.player_teams;

CREATE POLICY "Admins have full access to player_teams"
ON public.player_teams FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PLAYER_TEAM_MEMBERS TABLE (Admin only)
DROP POLICY IF EXISTS "Allow all operations on player_team_members" ON public.player_team_members;

CREATE POLICY "Admins have full access to player_team_members"
ON public.player_team_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TEE_BOXES TABLE (Admin only)
DROP POLICY IF EXISTS "Allow all operations on tee_boxes" ON public.tee_boxes;

CREATE POLICY "Admins have full access to tee_boxes"
ON public.tee_boxes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- GROUPS TABLE (Admin only)
DROP POLICY IF EXISTS "Allow all operations on groups" ON public.groups;

CREATE POLICY "Admins have full access to groups"
ON public.groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- GROUP_ASSIGNMENTS TABLE (Admin only)
DROP POLICY IF EXISTS "Allow all operations on group_assignments" ON public.group_assignments;

CREATE POLICY "Admins have full access to group_assignments"
ON public.group_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ROUND_SCORES TABLE (Both Admin and Scorer can manage)
DROP POLICY IF EXISTS "Allow all operations on round_scores" ON public.round_scores;

CREATE POLICY "Authenticated users can manage round_scores"
ON public.round_scores FOR ALL TO authenticated
USING (true)
WITH CHECK (true);