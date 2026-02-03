-- Permitir que Administrador Master edite configurações administrativas (UFMS, fatores, etc.)

-- Ajustar política existente que hoje permite apenas 'administrador'
DROP POLICY IF EXISTS "Apenas administradores podem editar configurações" ON public.configuracoes_administrativas;

CREATE POLICY "Apenas administradores podem editar configurações"
ON public.configuracoes_administrativas
FOR ALL
TO public
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'administrador_master'::app_role)
);