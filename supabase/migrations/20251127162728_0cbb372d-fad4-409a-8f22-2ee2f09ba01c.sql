-- Create courses table (simplified)
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policies for courses
CREATE POLICY "Authenticated users can view courses"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify courses"
  ON public.courses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create course_tees table
CREATE TABLE public.course_tees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  total_yardage INTEGER,
  slope_rating NUMERIC,
  course_rating NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_tees ENABLE ROW LEVEL SECURITY;

-- Create policies for course_tees
CREATE POLICY "Authenticated users can view course_tees"
  ON public.course_tees FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify course_tees"
  ON public.course_tees FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create course_holes table
CREATE TABLE public.course_holes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  par INTEGER NOT NULL CHECK (par >= 3 AND par <= 5),
  handicap_index INTEGER CHECK (handicap_index >= 1 AND handicap_index <= 18),
  is_ctp_hole BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, hole_number)
);

-- Enable RLS
ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;

-- Create policies for course_holes
CREATE POLICY "Authenticated users can view course_holes"
  ON public.course_holes FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify course_holes"
  ON public.course_holes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add course_id to events table
ALTER TABLE public.events
  ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_course_tees_course_id ON public.course_tees(course_id);
CREATE INDEX idx_course_holes_course_id ON public.course_holes(course_id);
CREATE INDEX idx_events_course_id ON public.events(course_id);