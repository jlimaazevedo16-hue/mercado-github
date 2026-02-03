import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SetupStatusContextType {
  isInstalled: boolean;
  masterUsersCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SetupStatusContext = createContext<SetupStatusContextType | undefined>(undefined);

export const SetupStatusProvider = ({ children }: { children: ReactNode }) => {
  const [isInstalled, setIsInstalled] = useState(true); // Default true to avoid flash
  const [masterUsersCount, setMasterUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSetupStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sistema_setup')
        .select('setup_concluido, master_users_count')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching setup status:', error);
        // If table doesn't exist or error, assume not installed
        setIsInstalled(false);
        setMasterUsersCount(0);
      } else if (data) {
        setIsInstalled(data.setup_concluido ?? false);
        setMasterUsersCount(data.master_users_count ?? 0);
      } else {
        // No row exists, not installed
        setIsInstalled(false);
        setMasterUsersCount(0);
      }
    } catch (error) {
      console.error('Error in fetchSetupStatus:', error);
      setIsInstalled(false);
      setMasterUsersCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  return (
    <SetupStatusContext.Provider 
      value={{ 
        isInstalled, 
        masterUsersCount,
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

// Backward compatibility alias
export const useSetupConcluido = () => {
  const { isInstalled, loading } = useSetupStatus();
  return { setupConcluido: isInstalled, loading };
};
