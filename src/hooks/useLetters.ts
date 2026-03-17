import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { Letter } from '@/types/hr.types';

export function useLetters() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from('letters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching letters:', error);
    setLetters(data ?? []);
    setLoading(false);
  }, []);

  const save = useCallback(async (
    letter: Partial<Letter>,
    id?: string,
    userName?: string,
    userDesig?: string,
  ): Promise<string | null> => {
    const now = new Date().toISOString();
    const clean: Record<string, any> = {
      ref_no: letter.ref_no,
      type: letter.type,
      firm: letter.firm || 'opc',
      to_name: letter.to_name || '',
      to_designation: letter.to_designation || '',
      to_company: letter.to_company || '',
      to_address: letter.to_address || '',
      subject: letter.subject || '',
      body: letter.body || '',
      site: letter.site || '',
      status: letter.status || 'Draft',
      ofr_data: letter.ofr_data
        ? (typeof letter.ofr_data === 'string' ? letter.ofr_data : JSON.stringify(letter.ofr_data))
        : null,
    };

    if (id) {
      clean.updated_at = now;
      clean.updated_by = userName;
      if (clean.status === 'Issued' && !letter.signed_by) {
        clean.signed_by = userName;
        clean.signed_desig = userDesig || '';
        clean.signed_at = now;
      }
      const { error } = await db.from('letters').update(clean).eq('id', id);
      if (error) return error.message;
    } else {
      clean.created_at = now;
      clean.created_by = userName;
      const { error } = await db.from('letters').insert([clean]);
      if (error) return error.message;
    }
    await fetch();
    return null;
  }, [fetch]);

  const markIssued = useCallback(async (
    id: string,
    userName: string,
  ): Promise<string | null> => {
    const { error } = await db
      .from('letters')
      .update({
        status: 'Issued',
        updated_at: new Date().toISOString(),
        updated_by: userName,
      })
      .eq('id', id);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  return { letters, loading, fetch, save, markIssued };
}
