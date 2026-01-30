-- Add CPF column to profiles table for login lookup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;

-- Create index for faster CPF lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;