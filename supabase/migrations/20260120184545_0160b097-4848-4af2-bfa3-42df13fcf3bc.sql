-- Add columns for external notifications
ALTER TABLE notificacoes
ADD COLUMN IF NOT EXISTS orgao_fiscalizador VARCHAR(255),
ADD COLUMN IF NOT EXISTS numero_auto_externo VARCHAR(100);

-- Insert test data for notifications
INSERT INTO notificacoes (tipo, box_id, responsavel_id, artigo_violado, classificacao, descricao_infracao, data_notificacao, prazo_defesa, prazo_adequacao, status, numero_interno)
SELECT 
  'interna',
  b.id,
  b.responsavel_id,
  'Art. 15, I - Descumprimento de normas sanitárias',
  'media',
  'Identificado acúmulo de resíduos em área de manipulação de alimentos, descumprindo normas sanitárias.',
  CURRENT_DATE - INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '25 days',
  'pendente',
  '0001/2026'
FROM boxes b
WHERE b.codigo = 'BOX-001'
LIMIT 1;

INSERT INTO notificacoes (tipo, box_id, responsavel_id, artigo_violado, classificacao, descricao_infracao, data_notificacao, prazo_defesa, prazo_adequacao, status, numero_interno)
SELECT 
  'interna',
  b.id,
  b.responsavel_id,
  'Art. 16, I - Comércio de produtos não autorizados',
  'grave',
  'Comercialização de produtos fora do escopo autorizado no contrato de concessão.',
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '20 days',
  'em_analise',
  '0002/2026'
FROM boxes b
WHERE b.codigo = 'BOX-003'
LIMIT 1;

INSERT INTO notificacoes (tipo, box_id, responsavel_id, artigo_violado, classificacao, descricao_infracao, data_notificacao, prazo_defesa, prazo_adequacao, status, orgao_fiscalizador, numero_auto_externo)
SELECT 
  'externa',
  b.id,
  b.responsavel_id,
  'Lei 8137/90 - Art. 7º - Fraude em pesos e medidas',
  'gravissima',
  'Auto de infração lavrado pelo IPEM/INMETRO por irregularidade em balança de pesagem.',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '30 days',
  'pendente',
  'IPEM/INMETRO',
  'AI-2026-00458'
FROM boxes b
WHERE b.codigo = 'BOX-002'
LIMIT 1;

-- Update notification sequence
INSERT INTO notification_sequence (ano, ultimo_numero)
VALUES (2026, 2)
ON CONFLICT (ano) DO UPDATE SET ultimo_numero = 2;

-- Insert test certificates with various expiration dates for boxes
INSERT INTO box_documents (box_id, nome, tipo, data_emissao, data_validade, descricao)
SELECT 
  b.id,
  'Alvará de Funcionamento 2025',
  'Alvará',
  '2025-01-15',
  CURRENT_DATE - INTERVAL '15 days',  -- Vencido
  'Alvará de funcionamento municipal'
FROM boxes b
WHERE b.codigo = 'BOX-001'
LIMIT 1;

INSERT INTO box_documents (box_id, nome, tipo, data_emissao, data_validade, descricao)
SELECT 
  b.id,
  'Licença Sanitária',
  'Licença',
  '2025-06-01',
  CURRENT_DATE + INTERVAL '10 days',  -- Vencendo
  'Licença sanitária VISA'
FROM boxes b
WHERE b.codigo = 'BOX-002'
LIMIT 1;

INSERT INTO box_documents (box_id, nome, tipo, data_emissao, data_validade, descricao)
SELECT 
  b.id,
  'Certificado de Bombeiros',
  'Licença',
  '2025-03-01',
  CURRENT_DATE + INTERVAL '90 days',  -- Válido
  'Auto de vistoria do corpo de bombeiros'
FROM boxes b
WHERE b.codigo = 'BOX-003'
LIMIT 1;

INSERT INTO box_documents (box_id, nome, tipo, data_emissao, data_validade, descricao)
SELECT 
  b.id,
  'Alvará Vigilância Sanitária',
  'Alvará',
  '2025-02-01',
  CURRENT_DATE + INTERVAL '5 days',  -- Urgente
  'Alvará de vigilância sanitária estadual'
FROM boxes b
WHERE b.codigo = 'BOX-004'
LIMIT 1;

INSERT INTO box_documents (box_id, nome, tipo, data_emissao, data_validade, descricao)
SELECT 
  b.id,
  'Licença Ambiental',
  'Licença',
  '2024-12-01',
  CURRENT_DATE - INTERVAL '30 days',  -- Vencido há 30 dias
  'Licença ambiental para operação'
FROM boxes b
WHERE b.codigo = 'BOX-005'
LIMIT 1;

-- Insert some maintenance requests
INSERT INTO box_maintenances (box_id, tipo, descricao, data_solicitacao, status, responsavel)
SELECT 
  b.id,
  'Elétrica',
  'Troca de disjuntor com falha intermitente',
  CURRENT_DATE - INTERVAL '20 days',
  'PENDENTE',
  'Manutenção Interna'
FROM boxes b
WHERE b.codigo = 'BOX-002'
LIMIT 1;

INSERT INTO box_maintenances (box_id, tipo, descricao, data_solicitacao, status, responsavel)
SELECT 
  b.id,
  'Hidráulica',
  'Vazamento na torneira da pia',
  CURRENT_DATE - INTERVAL '5 days',
  'EM_ANDAMENTO',
  'Manutenção Interna'
FROM boxes b
WHERE b.codigo = 'BOX-004'
LIMIT 1;