-- Add master_users_count column to sistema_setup
ALTER TABLE public.sistema_setup 
ADD COLUMN IF NOT EXISTS master_users_count integer DEFAULT 0;

-- Update the count based on existing master users
UPDATE public.sistema_setup 
SET master_users_count = (
  SELECT COUNT(*) FROM public.user_roles WHERE role = 'administrador_master'
);

-- Create function to check if system is installed
CREATE OR REPLACE FUNCTION public.is_system_installed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT setup_concluido FROM public.sistema_setup LIMIT 1),
    false
  )
$$;

-- Create function to get master user count
CREATE OR REPLACE FUNCTION public.get_master_users_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT master_users_count FROM public.sistema_setup LIMIT 1),
    0
  )
$$;

-- Create function to increment master count (called by edge function)
CREATE OR REPLACE FUNCTION public.increment_master_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sistema_setup 
  SET master_users_count = master_users_count + 1,
      updated_at = now();
END;
$$;

-- Create function to decrement master count
CREATE OR REPLACE FUNCTION public.decrement_master_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sistema_setup 
  SET master_users_count = GREATEST(0, master_users_count - 1),
      updated_at = now();
END;
$$;

-- RLS: Allow anyone to read sistema_setup (needed for setup check)
DROP POLICY IF EXISTS "Anyone can read sistema_setup" ON public.sistema_setup;
CREATE POLICY "Anyone can read sistema_setup" 
ON public.sistema_setup 
FOR SELECT 
USING (true);

-- RLS: Only master admins can update sistema_setup
DROP POLICY IF EXISTS "Master admins can update sistema_setup" ON public.sistema_setup;
CREATE POLICY "Master admins can update sistema_setup" 
ON public.sistema_setup 
FOR UPDATE 
USING (public.is_admin_master(auth.uid()));

-- RLS: Allow insert during initial setup (when no setup exists)
DROP POLICY IF EXISTS "Allow initial setup insert" ON public.sistema_setup;
CREATE POLICY "Allow initial setup insert" 
ON public.sistema_setup 
FOR INSERT 
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.sistema_setup WHERE setup_concluido = true)
);