-- Insert new email branding configuration keys
INSERT INTO public.configuracoes_administrativas (chave, valor, descricao, unidade)
VALUES 
  ('instituicao_email', 0, 'contato@mercadomunicipal.com.br', NULL),
  ('instituicao_logo_url', 0, '', NULL),
  ('instituicao_cor_primaria', 0, '#1e40af', NULL),
  ('instituicao_cor_secundaria', 0, '#f59e0b', NULL)
ON CONFLICT (chave) DO NOTHING;