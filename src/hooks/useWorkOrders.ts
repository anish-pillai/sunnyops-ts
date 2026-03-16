import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { WorkOrder } from '@/types/bill.types';

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setWorkOrders(data ?? []);
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveWorkOrder = useCallback(async (wo: Partial<WorkOrder>, id?: string) => {
    const payload = {
      ...wo,
      updated_at: new Date().toISOString()
    };

    if (id) {
      const { error } = await db.from('work_orders').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await db.from('work_orders').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) throw error;
    }
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  const deleteWorkOrder = useCallback(async (id: string) => {
    const { error } = await db.from('work_orders').delete().eq('id', id);
    if (error) throw error;
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  return { workOrders, loading, fetchWorkOrders, saveWorkOrder, deleteWorkOrder };
}
