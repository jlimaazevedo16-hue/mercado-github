-- Adicionar campos de horário permitido para envio
ALTER TABLE public.whatsapp_config
ADD COLUMN IF NOT EXISTS hora_inicio_envio TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_fim_envio TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS max_tentativas INTEGER DEFAULT 3;

-- Atualizar registro existente se houver
UPDATE public.whatsapp_config
SET hora_inicio_envio = '08:00:00',
    hora_fim_envio = '18:00:00',
    max_tentativas = 3
WHERE hora_inicio_envio IS NULL;