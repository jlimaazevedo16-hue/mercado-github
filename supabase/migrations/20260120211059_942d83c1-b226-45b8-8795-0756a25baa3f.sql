-- Step 1: Add new enum values
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'administrador_master';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lojista';