import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { Bill } from '@/types/bill.types';

export function useBills(assignedSites?: string[]) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = db.from('bills').select('*').order('invoice_date', { ascending: false });
    if (assignedSites?.length) query = query.in('site', assignedSites);
    const { data } = await query;
    setBills(data ?? []);
    setLoading(false);
  }, [assignedSites?.join(',')]);

  const save = useCallback(async (
    bill: Omit<Bill, 'id' | 'created_at'>,
    id?: string
  ): Promise<string | null> => {
    const payload = { ...bill, updated_at: new Date().toISOString() };
    const { error } = id
      ? await db.from('bills').update(payload).eq('id', id)
      : await db.from('bills').insert([payload]);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await db.from('bills').delete().eq('id', id);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  return { bills, loading, fetch, save, remove };
}
