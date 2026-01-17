-- Tabela de produtos/espécies para o Observatório de Comercialização
CREATE TABLE public.moc_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segmento VARCHAR NOT NULL CHECK (segmento IN ('Pescado', 'Carne', 'Hortifruti')),
  nome_popular VARCHAR NOT NULL,
  nome_cientifico VARCHAR,
  familia VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de registros de comercialização
CREATE TABLE public.moc_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id UUID REFERENCES public.boxes(id),
  responsavel_id UUID REFERENCES public.responsaveis(id),
  produto_id UUID NOT NULL REFERENCES public.moc_produtos(id),
  quantidade_kg NUMERIC NOT NULL,
  estado_produto VARCHAR NOT NULL CHECK (estado_produto IN ('Inteiro', 'Filé', 'Carcaça', 'Vísceras', 'Processado', 'In Natura')),
  origem_municipio VARCHAR,
  origem_comunidade VARCHAR,
  origem_rio VARCHAR,
  data_coleta DATE NOT NULL DEFAULT CURRENT_DATE,
  destinacao VARCHAR NOT NULL CHECK (destinacao IN ('Revenda Local', 'Exportação', 'Consumidor Final')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.moc_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moc_registros ENABLE ROW LEVEL SECURITY;

-- Políticas para moc_produtos
CREATE POLICY "Produtos are viewable by everyone" ON public.moc_produtos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert moc_produtos" ON public.moc_produtos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update moc_produtos" ON public.moc_produtos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete moc_produtos" ON public.moc_produtos FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para moc_registros
CREATE POLICY "Registros are viewable by everyone" ON public.moc_registros FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert moc_registros" ON public.moc_registros FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update moc_registros" ON public.moc_registros FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete moc_registros" ON public.moc_registros FOR DELETE USING (auth.role() = 'authenticated');

-- Triggers para updated_at
CREATE TRIGGER update_moc_produtos_updated_at
  BEFORE UPDATE ON public.moc_produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moc_registros_updated_at
  BEFORE UPDATE ON public.moc_registros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns produtos de exemplo para facilitar o uso
INSERT INTO public.moc_produtos (segmento, nome_popular, nome_cientifico, familia) VALUES
-- Pescados
('Pescado', 'Pirarucu', 'Arapaima gigas', 'Arapaimidae'),
('Pescado', 'Tambaqui', 'Colossoma macropomum', 'Serrasalmidae'),
('Pescado', 'Tucunaré', 'Cichla spp.', 'Cichlidae'),
('Pescado', 'Jaraqui', 'Semaprochilodus spp.', 'Prochilodontidae'),
('Pescado', 'Matrinxã', 'Brycon amazonicus', 'Bryconidae'),
('Pescado', 'Curimatã', 'Prochilodus nigricans', 'Prochilodontidae'),
('Pescado', 'Pacu', 'Mylossoma spp.', 'Serrasalmidae'),
('Pescado', 'Sardinha', 'Triportheus spp.', 'Triportheidae'),
('Pescado', 'Aracu', 'Leporinus spp.', 'Anostomidae'),
('Pescado', 'Pirapitinga', 'Piaractus brachypomus', 'Serrasalmidae'),
-- Carnes
('Carne', 'Bovino - Acém', NULL, NULL),
('Carne', 'Bovino - Picanha', NULL, NULL),
('Carne', 'Bovino - Costela', NULL, NULL),
('Carne', 'Suíno - Pernil', NULL, NULL),
('Carne', 'Suíno - Costela', NULL, NULL),
('Carne', 'Frango - Inteiro', NULL, NULL),
('Carne', 'Frango - Coxa', NULL, NULL),
-- Hortifruti
('Hortifruti', 'Banana', 'Musa spp.', 'Musaceae'),
('Hortifruti', 'Mandioca', 'Manihot esculenta', 'Euphorbiaceae'),
('Hortifruti', 'Açaí', 'Euterpe oleracea', 'Arecaceae'),
('Hortifruti', 'Cupuaçu', 'Theobroma grandiflorum', 'Malvaceae'),
('Hortifruti', 'Pupunha', 'Bactris gasipaes', 'Arecaceae');