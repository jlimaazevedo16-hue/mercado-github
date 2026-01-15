-- Create responsaveis (responsible persons) table
CREATE TABLE public.responsaveis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    data_nascimento DATE,
    telefone VARCHAR(20),
    telefone_secundario VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'ATIVO',
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create box_documents table
CREATE TABLE public.box_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    tipo VARCHAR(50),
    descricao TEXT,
    arquivo_url TEXT,
    data_emissao DATE,
    data_validade DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create box_maintenances table
CREATE TABLE public.box_maintenances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_execucao DATE,
    custo NUMERIC(10,2),
    responsavel VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDENTE',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create box_history table for tracking changes
CREATE TABLE public.box_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
    campo VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responsavel_documents table
CREATE TABLE public.responsavel_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    tipo VARCHAR(50),
    descricao TEXT,
    arquivo_url TEXT,
    data_emissao DATE,
    data_validade DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responsavel_history table
CREATE TABLE public.responsavel_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    campo VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add responsavel_id and position coordinates to boxes table
ALTER TABLE public.boxes 
ADD COLUMN responsavel_id UUID REFERENCES public.responsaveis(id),
ADD COLUMN pos_x NUMERIC,
ADD COLUMN pos_y NUMERIC,
ADD COLUMN planta_width NUMERIC DEFAULT 80,
ADD COLUMN planta_height NUMERIC DEFAULT 80;

-- Enable RLS on all new tables
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for responsaveis
CREATE POLICY "Responsaveis are viewable by everyone" ON public.responsaveis FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert responsaveis" ON public.responsaveis FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update responsaveis" ON public.responsaveis FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete responsaveis" ON public.responsaveis FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for box_documents
CREATE POLICY "Box documents are viewable by everyone" ON public.box_documents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert box_documents" ON public.box_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update box_documents" ON public.box_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete box_documents" ON public.box_documents FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for box_maintenances
CREATE POLICY "Box maintenances are viewable by everyone" ON public.box_maintenances FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert box_maintenances" ON public.box_maintenances FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update box_maintenances" ON public.box_maintenances FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete box_maintenances" ON public.box_maintenances FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for box_history
CREATE POLICY "Box history is viewable by everyone" ON public.box_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert box_history" ON public.box_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for responsavel_documents
CREATE POLICY "Responsavel documents are viewable by everyone" ON public.responsavel_documents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert responsavel_documents" ON public.responsavel_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update responsavel_documents" ON public.responsavel_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete responsavel_documents" ON public.responsavel_documents FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for responsavel_history
CREATE POLICY "Responsavel history is viewable by everyone" ON public.responsavel_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert responsavel_history" ON public.responsavel_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_responsaveis_updated_at
BEFORE UPDATE ON public.responsaveis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_box_documents_updated_at
BEFORE UPDATE ON public.box_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_box_maintenances_updated_at
BEFORE UPDATE ON public.box_maintenances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responsavel_documents_updated_at
BEFORE UPDATE ON public.responsavel_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();