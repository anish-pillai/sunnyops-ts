import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { Challan } from '@/types/challan.types';

export function useChallans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('challans').select('*').order('created_at', { ascending: false }).limit(200);
    setChallans(data ?? []);
    setLoading(false);
  }, []);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await db.from('challans').delete().eq('id', id);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  return { challans, loading, fetch, remove };
}
