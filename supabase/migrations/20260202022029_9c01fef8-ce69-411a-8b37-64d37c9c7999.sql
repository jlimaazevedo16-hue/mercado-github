-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Create updated policies that include administrador_master
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
);

CREATE POLICY "Only admins can insert roles" 
ON public.user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
);

CREATE POLICY "Only admins can update roles" 
ON public.user_roles FOR UPDATE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
);

CREATE POLICY "Only admins can delete roles" 
ON public.user_roles FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
);