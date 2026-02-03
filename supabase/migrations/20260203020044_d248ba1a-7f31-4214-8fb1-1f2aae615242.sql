-- Adicionar valor de cobrança padrão por setor
ALTER TABLE public.setores
ADD COLUMN IF NOT EXISTS valor_cobranca_padrao numeric DEFAULT 50.00;

-- Comentário explicativo
COMMENT ON COLUMN public.setores.valor_cobranca_padrao IS 'Valor de cobrança padrão para boxes deste setor. Mínimo R$ 50,00.';