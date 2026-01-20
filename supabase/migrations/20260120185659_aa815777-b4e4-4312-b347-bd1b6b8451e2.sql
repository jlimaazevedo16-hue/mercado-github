-- Tabela de configurações administrativas
CREATE TABLE public.configuracoes_administrativas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    valor DECIMAL(15,4) NOT NULL,
    descricao TEXT,
    unidade VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_administrativas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - leitura para todos autenticados
CREATE POLICY "Configurações visíveis para autenticados" 
ON public.configuracoes_administrativas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Edição apenas para administradores
CREATE POLICY "Apenas administradores podem editar configurações" 
ON public.configuracoes_administrativas 
FOR ALL
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Trigger para updated_at
CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes_administrativas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir valores padrão
INSERT INTO public.configuracoes_administrativas (chave, valor, descricao, unidade) VALUES
('ufms_valor', 4.5971, 'Valor atual da UFMS (Unidade Fiscal)', 'R$'),
('fator_condominio', 2.5, 'Fator multiplicador para taxa de condomínio', 'x UFMS'),
('fator_aluguel', 5.0, 'Fator multiplicador para taxa de aluguel por m²', 'x UFMS');

-- Tabela de extrações mensais
CREATE TABLE public.extracoes_mensais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mes_referencia DATE NOT NULL,
    data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    total_boxes INTEGER,
    valor_total_condominio DECIMAL(15,2),
    valor_total_aluguel DECIMAL(15,2),
    valor_total_multas DECIMAL(15,2),
    arquivo_url TEXT,
    gerado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extracoes_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Extrações visíveis para autenticados" 
ON public.extracoes_mensais 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas administradores podem criar extrações" 
ON public.extracoes_mensais 
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Adicionar permissão para configurações
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit)
VALUES 
('administrador', 'configuracoes', true, true),
('fiscal', 'configuracoes', true, false),
('funcionario', 'configuracoes', false, false)
ON CONFLICT (role, permission_key) DO NOTHING;