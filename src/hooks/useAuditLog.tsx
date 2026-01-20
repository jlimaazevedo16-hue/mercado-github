import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogParams {
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async ({
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
  }: AuditLogParams) => {
    if (!user) return;

    try {
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        table_name: tableName || null,
        record_id: recordId || null,
        old_values: (oldValues as Json) || null,
        new_values: (newValues as Json) || null,
        user_agent: navigator.userAgent,
      }]);
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  return { logAction };
};
