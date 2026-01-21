-- Tabela de teste para validar conexão Supabase
CREATE TABLE public.teste_conexao_supabase (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (padrão de segurança)
ALTER TABLE public.teste_conexao_supabase ENABLE ROW LEVEL SECURITY;

-- Política permissiva para teste
CREATE POLICY "Acesso público para teste" 
ON public.teste_conexao_supabase 
FOR ALL 
USING (true) 
WITH CHECK (true);