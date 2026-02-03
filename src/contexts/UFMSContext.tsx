import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UFMSValues {
  ufmsValor: number;
  fatorCondominio: number;
  fatorAluguel: number;
  taxaCondominio: number;
  taxaAluguelM2: number;
  isLoading: boolean;
  lastUpdated: Date | null;
}

interface UFMSContextType extends UFMSValues {
  refetchUFMS: () => Promise<void>;
  invalidateAndRefetch: () => Promise<void>;
}

const UFMSContext = createContext<UFMSContextType | undefined>(undefined);

interface Configuracao {
  id: string;
  chave: string;
  valor: number;
}

export function UFMSProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: configuracoes, isLoading, refetch } = useQuery({
    queryKey: ['ufms-configuracoes-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_administrativas')
        .select('id, chave, valor')
        .in('chave', ['ufms_valor', 'fator_condominio', 'fator_aluguel']);

      if (error) throw error;
      setLastUpdated(new Date());
      return data as Configuracao[];
    },
    staleTime: 0,
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const ufmsValor = configuracoes?.find(c => c.chave === 'ufms_valor')?.valor || 0;
  const fatorCondominio = configuracoes?.find(c => c.chave === 'fator_condominio')?.valor || 0;
  const fatorAluguel = configuracoes?.find(c => c.chave === 'fator_aluguel')?.valor || 0;
  
  const taxaCondominio = ufmsValor * fatorCondominio;
  const taxaAluguelM2 = ufmsValor * fatorAluguel;

  const refetchUFMS = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const invalidateAndRefetch = useCallback(async () => {
    // Invalidate all related queries including component-local ones
    await queryClient.invalidateQueries({ queryKey: ['ufms-configuracoes-global'] });
    await queryClient.invalidateQueries({ queryKey: ['configuracoes-administrativas'] });
    await queryClient.invalidateQueries({ queryKey: ['configuracoes-ufms'] });
    await queryClient.invalidateQueries({ queryKey: ['financial-configs'] });
    await queryClient.invalidateQueries({ queryKey: ['financial-boxes'] });
    await queryClient.invalidateQueries({ queryKey: ['financial-pads'] });
    await queryClient.invalidateQueries({ queryKey: ['financial-extracoes'] });
    
    // Force refetch from server
    await refetch();
    setLastUpdated(new Date());
  }, [queryClient, refetch]);

  const value: UFMSContextType = {
    ufmsValor,
    fatorCondominio,
    fatorAluguel,
    taxaCondominio,
    taxaAluguelM2,
    isLoading,
    lastUpdated,
    refetchUFMS,
    invalidateAndRefetch,
  };

  return (
    <UFMSContext.Provider value={value}>
      {children}
    </UFMSContext.Provider>
  );
}

export function useUFMS() {
  const context = useContext(UFMSContext);
  if (context === undefined) {
    throw new Error('useUFMS must be used within a UFMSProvider');
  }
  return context;
}
