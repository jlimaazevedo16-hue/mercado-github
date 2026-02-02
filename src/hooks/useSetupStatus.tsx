import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SetupStatusContextType {
  setupConcluido: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SetupStatusContext = createContext<SetupStatusContextType | undefined>(undefined);

export const SetupStatusProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [setupConcluido, setSetupConcluido] = useState(true); // Default true to avoid blocking
  const [loading, setLoading] = useState(true);

  const fetchSetupStatus = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sistema_setup')
        .select('setup_concluido')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching setup status:', error);
        // Se tabela não existe ainda, consideramos como não configurado
        setSetupConcluido(false);
      } else {
        setSetupConcluido(data?.setup_concluido ?? false);
      }
    } catch (error) {
      console.error('Error in fetchSetupStatus:', error);
      setSetupConcluido(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetupStatus();
  }, [session]);

  return (
    <SetupStatusContext.Provider 
      value={{ 
        setupConcluido, 
        loading,
        refetch: fetchSetupStatus
      }}
    >
      {children}
    </SetupStatusContext.Provider>
  );
};

export const useSetupStatus = () => {
  const context = useContext(SetupStatusContext);
  if (context === undefined) {
    throw new Error('useSetupStatus must be used within a SetupStatusProvider');
  }
  return context;
};
