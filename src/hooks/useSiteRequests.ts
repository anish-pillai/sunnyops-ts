import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { SiteRequest } from '@/types/request.types';

export function useSiteRequests(assignedSites?: string[]) {
  const [requests, setRequests] = useState<SiteRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = db.from('site_requests').select('*').order('created_at', { ascending: false });
    if (assignedSites?.length) q = q.in('requesting_site', assignedSites);
    const { data } = await q;
    setRequests(data ?? []);
    setLoading(false);
  }, [assignedSites?.join(',')]);

  const save = useCallback(async (
    req: Omit<SiteRequest, 'id'>, id?: string
  ): Promise<string | null> => {
    const { error } = id
      ? await db.from('site_requests').update(req).eq('id', id)
      : await db.from('site_requests').insert([req]);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  const updateStatus = useCallback(async (
    id: string, status: SiteRequest['status'], by: string
  ): Promise<string | null> => {
    const { error } = await db.from('site_requests')
      .update({ status, approved_by: by, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return error.message;
    await fetch();
    return null;
  }, [fetch]);

  return { requests, loading, fetch, save, updateStatus };
}
