
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('administrador', 'fiscal', 'funcionario');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'funcionario',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    nome VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permissions table to define what each role can access
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_key VARCHAR NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (role, permission_key)
);

-- Create audit_logs table for tracking all actions
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR NOT NULL,
    table_name VARCHAR,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_key VARCHAR, _action VARCHAR DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = _user_id
          AND rp.permission_key = _permission_key
          AND (
            (_action = 'view' AND rp.can_view = true) OR
            (_action = 'edit' AND rp.can_edit = true)
          )
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'administrador') OR auth.uid() = user_id);

CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for role_permissions
CREATE POLICY "Anyone authenticated can view permissions"
ON public.role_permissions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage permissions"
ON public.role_permissions FOR ALL
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Authenticated users can insert logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit) VALUES
-- Administrador has full access
('administrador', 'dashboard', true, true),
('administrador', 'boxes', true, true),
('administrador', 'planta_baixa', true, true),
('administrador', 'responsaveis', true, true),
('administrador', 'documentos', true, true),
('administrador', 'almoxarifado', true, true),
('administrador', 'observatorio', true, true),
('administrador', 'gestao_usuarios', true, true),
-- Fiscal has view access to most, edit to some
('fiscal', 'dashboard', true, false),
('fiscal', 'boxes', true, true),
('fiscal', 'planta_baixa', true, false),
('fiscal', 'responsaveis', true, true),
('fiscal', 'documentos', true, true),
('fiscal', 'almoxarifado', true, false),
('fiscal', 'observatorio', true, true),
('fiscal', 'gestao_usuarios', false, false),
-- Funcionário has limited access
('funcionario', 'dashboard', true, false),
('funcionario', 'boxes', true, false),
('funcionario', 'planta_baixa', true, false),
('funcionario', 'responsaveis', true, false),
('funcionario', 'documentos', true, false),
('funcionario', 'almoxarifado', true, true),
('funcionario', 'observatorio', true, false),
('funcionario', 'gestao_usuarios', false, false);

-- Trigger for updating updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, nome, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
    
    -- Assign default role (funcionario)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'funcionario');
    
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
