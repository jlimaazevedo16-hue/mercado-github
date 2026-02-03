-- Adicionar campo de valor de cobrança customizado por box
-- Quando NULL, usa o cálculo padrão baseado em UFMS
-- Quando preenchido, este valor é usado nos relatórios financeiros

ALTER TABLE public.boxes
ADD COLUMN IF NOT EXISTS valor_cobranca_customizado numeric DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.boxes.valor_cobranca_customizado IS 'Valor de cobrança personalizado. Quando NULL, usa cálculo UFMS padrão (condomínio + aluguel por m²). Quando preenchido, este valor é usado nos relatórios financeiros.';