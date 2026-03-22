import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';

export interface BillAuditEntry {
  id: string;
  bill_id: string;
  inv_no: string;
  action: string;
  changed_fields: Record<string, any>;
  done_by: string;
  done_by_role: string;
  created_at: string;
}

export function useBillAudit() {
  const [entries, setEntries] = useState<BillAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from('bill_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    setEntries(data ?? []);
    setLoading(false);
  }, []);

  return { entries, loading, fetchAuditLog };
}
