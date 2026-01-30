import { supabase } from '@/integrations/supabase/client';
import type { InstitutionalConfig } from './types';

const CONFIG_KEYS = [
  'instituicao_nome',
  'instituicao_cnpj',
  'instituicao_endereco',
  'instituicao_cidade',
  'instituicao_telefone',
  'sistema_nome',
  'rodape_texto',
];

// Default values
const DEFAULT_CONFIG: InstitutionalConfig = {
  nome: 'Associação dos Feirantes do Mercado Central',
  cnpj: '00.000.000/0001-00',
  endereco: 'Rua do Mercado, 100 - Centro',
  cidade: 'Cidade/UF',
  telefone: '(00) 0000-0000',
  sistemaNome: 'Mercado Municipal Digital',
  rodapeTexto: 'Documento gerado eletronicamente pelo sistema. Este documento possui validade administrativa.',
  logoUrl: '/src/assets/logo_associacao.jpeg',
};

export async function getInstitutionalConfig(): Promise<InstitutionalConfig> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_administrativas')
      .select('chave, descricao')
      .in('chave', CONFIG_KEYS);

    if (error || !data || data.length === 0) {
      return DEFAULT_CONFIG;
    }

    const configMap = new Map(data.map(item => [item.chave, item.descricao]));

    return {
      nome: configMap.get('instituicao_nome') || DEFAULT_CONFIG.nome,
      cnpj: configMap.get('instituicao_cnpj') || DEFAULT_CONFIG.cnpj,
      endereco: configMap.get('instituicao_endereco') || DEFAULT_CONFIG.endereco,
      cidade: configMap.get('instituicao_cidade') || DEFAULT_CONFIG.cidade,
      telefone: configMap.get('instituicao_telefone') || DEFAULT_CONFIG.telefone,
      sistemaNome: configMap.get('sistema_nome') || DEFAULT_CONFIG.sistemaNome,
      rodapeTexto: configMap.get('rodape_texto') || DEFAULT_CONFIG.rodapeTexto,
      logoUrl: DEFAULT_CONFIG.logoUrl,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function updateInstitutionalConfig(
  key: keyof InstitutionalConfig,
  value: string
): Promise<boolean> {
  const keyMap: Record<string, string> = {
    nome: 'instituicao_nome',
    cnpj: 'instituicao_cnpj',
    endereco: 'instituicao_endereco',
    cidade: 'instituicao_cidade',
    telefone: 'instituicao_telefone',
    sistemaNome: 'sistema_nome',
    rodapeTexto: 'rodape_texto',
  };

  const dbKey = keyMap[key];
  if (!dbKey) return false;

  const { error } = await supabase
    .from('configuracoes_administrativas')
    .update({ descricao: value })
    .eq('chave', dbKey);

  return !error;
}
