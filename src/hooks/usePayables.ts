import { useState, useCallback, useEffect } from 'react';
import { db } from '@/config/supabase';
import type { Payable } from '@/types/bill.types';

export function usePayables(assignedSites?: string[]) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = db.from('payables').select('*').order('due_date', { ascending: true });
    if (assignedSites?.length) q = q.in('site', assignedSites);
    const { data } = await q;
    setPayables(data ?? []);
    setLoading(false);
  }, [assignedSites?.join(',')]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = useCallback(async (
    payable: Omit<Payable, 'id' | 'created_at'>, id?: string
  ): Promise<string | null> => {
    const payload = { ...payable, updated_at: new Date().toISOString() };
    const { error } = id
      ? await db.from('payables').update(payload).eq('id', id)
      : await db.from('payables').insert([payload]);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await db.from('payables').delete().eq('id', id);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  const saveMany = useCallback(async (
    payloads: Omit<Payable, 'id' | 'created_at'>[]
  ): Promise<string | null> => {
    const now = new Date().toISOString();
    const preparedPayloads = payloads.map(p => ({ ...p, updated_at: now }));
    const { error } = await db.from('payables').insert(preparedPayloads);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  return { payables, loading, fetch, save, saveMany, remove };
}
