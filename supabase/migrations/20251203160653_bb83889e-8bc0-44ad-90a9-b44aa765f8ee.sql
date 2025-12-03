-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage round_scores" ON public.round_scores;

-- Create policy for viewing scores (all authenticated users can view)
CREATE POLICY "Authenticated users can view round_scores" 
ON public.round_scores 
FOR SELECT 
USING (true);

-- Create policy for modifying scores (only admins and scorers)
CREATE POLICY "Admins and scorers can modify round_scores" 
ON public.round_scores 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scorer'));

CREATE POLICY "Admins and scorers can update round_scores" 
ON public.round_scores 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scorer'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scorer'));

CREATE POLICY "Admins and scorers can delete round_scores" 
ON public.round_scores 
FOR DELETE 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scorer'));