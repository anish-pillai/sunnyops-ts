import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { StockMovement } from '@/types/inventory.types';

export function useStockLogs() {
  const [logs, setLogs] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    // Order by moved_at descending to show latest logs first
    const { data, error } = await db
      .from('stock_logs')
      .select('*')
      .order('moved_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching stock logs:', error);
    } else {
      setLogs(data ?? []);
    }
    setLoading(false);
  }, []);

  return { logs, loading, fetchLogs };
}
