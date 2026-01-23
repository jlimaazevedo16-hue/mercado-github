-- Criar tabela de setores
CREATE TABLE public.setores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    mercado VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de segmentos
CREATE TABLE public.segmentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para setores (leitura pública, escrita autenticada)
CREATE POLICY "Setores are viewable by everyone" 
ON public.setores 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert setores" 
ON public.setores 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can update setores" 
ON public.setores 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can delete setores" 
ON public.setores 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Políticas RLS para segmentos (leitura pública, escrita autenticada)
CREATE POLICY "Segmentos are viewable by everyone" 
ON public.segmentos 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert segmentos" 
ON public.segmentos 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can update segmentos" 
ON public.segmentos 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can delete segmentos" 
ON public.segmentos 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Adicionar colunas FK na tabela boxes
ALTER TABLE public.boxes 
ADD COLUMN setor_id UUID REFERENCES public.setores(id),
ADD COLUMN segmento_id UUID REFERENCES public.segmentos(id);

-- Criar índices para performance
CREATE INDEX idx_boxes_setor_id ON public.boxes(setor_id);
CREATE INDEX idx_boxes_segmento_id ON public.boxes(segmento_id);

-- Triggers para updated_at
CREATE TRIGGER update_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segmentos_updated_at
BEFORE UPDATE ON public.segmentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();