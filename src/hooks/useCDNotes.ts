import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { CreditDebitNote } from '@/types/bill.types';

export function useCDNotes() {
  const [cdNotes, setCDNotes] = useState<CreditDebitNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCDNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('credit_debit_notes')
        .select('*')
        .order('note_date', { ascending: false });
      
      if (error) throw error;
      setCDNotes(data ?? []);
    } catch (err) {
      console.error('Error fetching credit/debit notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCDNote = useCallback(async (note: Partial<CreditDebitNote>, id?: string) => {
    const payload = {
      ...note,
      updated_at: new Date().toISOString()
    };

    if (id) {
      const { error } = await db.from('credit_debit_notes').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await db.from('credit_debit_notes').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) throw error;
    }
    await fetchCDNotes();
  }, [fetchCDNotes]);

  const deleteCDNote = useCallback(async (id: string) => {
    const { error } = await db.from('credit_debit_notes').delete().eq('id', id);
    if (error) throw error;
    await fetchCDNotes();
  }, [fetchCDNotes]);

  return { cdNotes, loading, fetchCDNotes, saveCDNote, deleteCDNote };
}
