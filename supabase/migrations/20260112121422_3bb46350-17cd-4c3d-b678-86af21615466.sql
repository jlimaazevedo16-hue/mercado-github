-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete boxes" ON public.boxes;
DROP POLICY IF EXISTS "Authenticated users can insert boxes" ON public.boxes;
DROP POLICY IF EXISTS "Authenticated users can update boxes" ON public.boxes;

-- Create proper RLS policies that actually check authentication
CREATE POLICY "Authenticated users can insert boxes" 
ON public.boxes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update boxes" 
ON public.boxes 
FOR UPDATE 
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete boxes" 
ON public.boxes 
FOR DELETE 
TO authenticated
USING (auth.role() = 'authenticated');