
-- Enum para classificação de infração
CREATE TYPE infraction_classification AS ENUM ('leve', 'media', 'grave', 'gravissima');

-- Enum para tipo de notificação
CREATE TYPE notification_type AS ENUM ('interna', 'externa');

-- Enum para status do PAD
CREATE TYPE pad_status AS ENUM ('autuacao', 'defesa', 'julgamento', 'recurso', 'decisao_final', 'arquivado');

-- Tabela de controle de numeração anual
CREATE TABLE public.notification_sequence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ano integer NOT NULL UNIQUE,
    ultimo_numero integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE public.notificacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_interno varchar,
    tipo notification_type NOT NULL,
    box_id uuid REFERENCES public.boxes(id) ON DELETE SET NULL,
    responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
    artigo_violado varchar NOT NULL,
    descricao_infracao text NOT NULL,
    classificacao infraction_classification NOT NULL,
    fiscal_id uuid,
    data_notificacao date NOT NULL DEFAULT CURRENT_DATE,
    prazo_defesa date,
    prazo_adequacao date,
    status varchar DEFAULT 'pendente',
    observacoes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de PAD (Processo Administrativo Disciplinar)
CREATE TABLE public.pads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_processo varchar NOT NULL UNIQUE,
    notificacao_id uuid REFERENCES public.notificacoes(id) ON DELETE CASCADE NOT NULL,
    box_id uuid REFERENCES public.boxes(id) ON DELETE SET NULL,
    responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
    status pad_status NOT NULL DEFAULT 'autuacao',
    data_autuacao date NOT NULL DEFAULT CURRENT_DATE,
    data_defesa date,
    data_julgamento date,
    data_recurso date,
    data_decisao_final date,
    valor_multa numeric,
    percentual_multa integer,
    taxa_condominio_base numeric,
    decisao_final text,
    fundamentacao text,
    relator varchar,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de etapas/histórico do PAD
CREATE TABLE public.pad_etapas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pad_id uuid REFERENCES public.pads(id) ON DELETE CASCADE NOT NULL,
    etapa pad_status NOT NULL,
    data_etapa date NOT NULL DEFAULT CURRENT_DATE,
    responsavel_etapa varchar,
    descricao text,
    documento_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de documentos do PAD (auto de infração, defesa, etc)
CREATE TABLE public.pad_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pad_id uuid REFERENCES public.pads(id) ON DELETE CASCADE NOT NULL,
    nome varchar NOT NULL,
    tipo varchar,
    descricao text,
    arquivo_url text,
    data_upload date DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pad_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pad_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_sequence
CREATE POLICY "Notification sequence viewable by authenticated" ON public.notification_sequence
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Notification sequence updatable by authenticated" ON public.notification_sequence
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Notification sequence insertable by authenticated" ON public.notification_sequence
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for notificacoes
CREATE POLICY "Notificacoes are viewable by everyone" ON public.notificacoes
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert notificacoes" ON public.notificacoes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update notificacoes" ON public.notificacoes
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete notificacoes" ON public.notificacoes
    FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for pads
CREATE POLICY "PADs are viewable by everyone" ON public.pads
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pads" ON public.pads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update pads" ON public.pads
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete pads" ON public.pads
    FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for pad_etapas
CREATE POLICY "PAD etapas are viewable by everyone" ON public.pad_etapas
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pad_etapas" ON public.pad_etapas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for pad_documents
CREATE POLICY "PAD documents are viewable by everyone" ON public.pad_documents
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pad_documents" ON public.pad_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update pad_documents" ON public.pad_documents
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete pad_documents" ON public.pad_documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to generate notification number
CREATE OR REPLACE FUNCTION public.generate_notification_number()
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_year integer;
    next_number integer;
    result varchar;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    INSERT INTO notification_sequence (ano, ultimo_numero)
    VALUES (current_year, 1)
    ON CONFLICT (ano) DO UPDATE SET ultimo_numero = notification_sequence.ultimo_numero + 1
    RETURNING ultimo_numero INTO next_number;
    
    result := LPAD(next_number::text, 4, '0') || '/' || current_year;
    RETURN result;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_notification_sequence_updated_at
    BEFORE UPDATE ON public.notification_sequence
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notificacoes_updated_at
    BEFORE UPDATE ON public.notificacoes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pads_updated_at
    BEFORE UPDATE ON public.pads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pad_documents_updated_at
    BEFORE UPDATE ON public.pad_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data for boxes (using correct enum values)
INSERT INTO public.boxes (codigo, boxe, setor, status, area_m2, inquilino, atividades) VALUES
('A001', 'Box 01', 'Setor A', 'ASSINADO', 25.5, 'Maria Silva', 'Pescados frescos'),
('A002', 'Box 02', 'Setor A', 'ASSINADO', 30.0, 'João Santos', 'Frutas e verduras'),
('A003', 'Box 03', 'Setor A', 'DISPONIVEL', 20.0, NULL, NULL),
('B001', 'Box 01', 'Setor B', 'ASSINADO', 35.0, 'Pedro Oliveira', 'Carnes e aves'),
('B002', 'Box 02', 'Setor B', 'PROCESSO', 28.0, 'Ana Costa', 'Laticínios'),
('B003', 'Box 03', 'Setor B', 'DISPONIVEL', 22.0, NULL, NULL),
('C001', 'Box 01', 'Setor C', 'ASSINADO', 40.0, 'Carlos Ferreira', 'Cereais e grãos'),
('C002', 'Box 02', 'Setor C', 'INTERDITADO', 25.0, NULL, NULL);

-- Insert test data for responsaveis
INSERT INTO public.responsaveis (nome, cpf, telefone, email, endereco, cidade, estado, status) VALUES
('Maria Silva', '123.456.789-00', '(91) 98765-4321', 'maria.silva@email.com', 'Rua das Flores, 123', 'Belém', 'PA', 'ATIVO'),
('João Santos', '234.567.890-11', '(91) 98765-4322', 'joao.santos@email.com', 'Av. Presidente Vargas, 456', 'Belém', 'PA', 'ATIVO'),
('Pedro Oliveira', '345.678.901-22', '(91) 98765-4323', 'pedro.oliveira@email.com', 'Rua São Brás, 789', 'Belém', 'PA', 'ATIVO'),
('Ana Costa', '456.789.012-33', '(91) 98765-4324', 'ana.costa@email.com', 'Tv. Padre Eutíquio, 321', 'Belém', 'PA', 'INADIMPLENTE'),
('Carlos Ferreira', '567.890.123-44', '(91) 98765-4325', 'carlos.ferreira@email.com', 'Av. Almirante Barroso, 654', 'Belém', 'PA', 'ATIVO');

-- Link boxes to responsaveis
UPDATE public.boxes SET responsavel_id = (SELECT id FROM public.responsaveis WHERE nome = 'Maria Silva') WHERE codigo = 'A001';
UPDATE public.boxes SET responsavel_id = (SELECT id FROM public.responsaveis WHERE nome = 'João Santos') WHERE codigo = 'A002';
UPDATE public.boxes SET responsavel_id = (SELECT id FROM public.responsaveis WHERE nome = 'Pedro Oliveira') WHERE codigo = 'B001';
UPDATE public.boxes SET responsavel_id = (SELECT id FROM public.responsaveis WHERE nome = 'Ana Costa') WHERE codigo = 'B002';
UPDATE public.boxes SET responsavel_id = (SELECT id FROM public.responsaveis WHERE nome = 'Carlos Ferreira') WHERE codigo = 'C001';

-- Add permission for notifications/PAD module
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit) VALUES
('administrador', 'notificacoes', true, true),
('fiscal', 'notificacoes', true, true),
('funcionario', 'notificacoes', true, false);
