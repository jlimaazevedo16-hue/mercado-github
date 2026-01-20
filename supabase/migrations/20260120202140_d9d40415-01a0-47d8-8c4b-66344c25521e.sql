-- Tabela para reuniões e assembleias
CREATE TABLE public.reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR NOT NULL CHECK (tipo IN ('reuniao', 'assembleia')),
  titulo VARCHAR NOT NULL,
  data_evento DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIME,
  hora_fim TIME,
  local VARCHAR,
  pauta TEXT,
  ata TEXT,
  status VARCHAR DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para controle de presença
CREATE TABLE public.reuniao_presencas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  presente BOOLEAN DEFAULT false,
  hora_chegada TIME,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reuniao_id, responsavel_id)
);

-- Enable RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuniao_presencas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para reunioes
CREATE POLICY "Reunioes viewable by authenticated" 
ON public.reunioes FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert reunioes" 
ON public.reunioes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reunioes" 
ON public.reunioes FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reunioes" 
ON public.reunioes FOR DELETE 
USING (auth.role() = 'authenticated');

-- RLS Policies para reuniao_presencas
CREATE POLICY "Presencas viewable by authenticated" 
ON public.reuniao_presencas FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert presencas" 
ON public.reuniao_presencas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update presencas" 
ON public.reuniao_presencas FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete presencas" 
ON public.reuniao_presencas FOR DELETE 
USING (auth.role() = 'authenticated');

-- Adicionar permissão para frequência
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit)
VALUES 
  ('administrador', 'frequencia', true, true),
  ('fiscal', 'frequencia', true, true),
  ('funcionario', 'frequencia', true, false)
ON CONFLICT DO NOTHING;