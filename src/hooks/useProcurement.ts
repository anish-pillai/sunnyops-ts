import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { PurchaseOrder, Quotation } from '@/types/procurement.types';

export const useProcurement = () => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from('purchase_orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPOs(data || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from('quotations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setQuotations(data || []);
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPOs(), fetchQuotations()]);
    setLoading(false);
  }, [fetchPOs, fetchQuotations]);

  const savePO = async (po: Partial<PurchaseOrder>) => {
    try {
      if (po.id) {
        const { error } = await db.from('purchase_orders').update(po).eq('id', po.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('purchase_orders').insert([po]);
        if (error) throw error;
      }
      await fetchPOs();
    } catch (err) {
      console.error('Error saving PO:', err);
      throw err;
    }
  };

  const saveQuotation = async (q: Partial<Quotation>) => {
    try {
      if (q.id) {
        const { error } = await db.from('quotations').update(q).eq('id', q.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('quotations').insert([q]);
        if (error) throw error;
      }
      await fetchQuotations();
    } catch (err) {
      console.error('Error saving quotation:', err);
      throw err;
    }
  };

  return {
    pos,
    quotations,
    loading,
    fetchPOs,
    fetchQuotations,
    fetchAll,
    savePO,
    saveQuotation
  };
};
