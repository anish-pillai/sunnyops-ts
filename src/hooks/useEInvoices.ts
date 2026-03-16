import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { EInvoice } from '@/types/bill.types';

export function useEInvoices() {
  const [einvoices, setEInvoices] = useState<EInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('einvoices')
        .select('*')
        .order('invoice_date', { ascending: false });
      
      if (error) throw error;
      setEInvoices(data ?? []);
    } catch (err) {
      console.error('Error fetching e-invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveEInvoice = useCallback(async (ei: Partial<EInvoice>, id?: string) => {
    const payload = {
      ...ei,
      updated_at: new Date().toISOString()
    };

    if (id) {
      const { error } = await db.from('einvoices').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await db.from('einvoices').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) throw error;
    }
    await fetchEInvoices();
  }, [fetchEInvoices]);

  const deleteEInvoice = useCallback(async (id: string) => {
    const { error } = await db.from('einvoices').delete().eq('id', id);
    if (error) throw error;
    await fetchEInvoices();
  }, [fetchEInvoices]);

  return { einvoices, loading, fetchEInvoices, saveEInvoice, deleteEInvoice };
}
