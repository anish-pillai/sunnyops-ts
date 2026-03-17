import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';

export interface ActivityRecord {
  id: string;
  user_id: string;
  user_name: string;
  module: string;
  action_type: string;
  description: string;
  old_value: string;
  new_value: string;
  timestamp: string;
  site: string;
}

export function useActivityData() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, loginRes, billsRes, payRes, chalRes, reqRes] = await Promise.all([
        db.from('stock_logs').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('login_history').select('*').order('logged_in_at', { ascending: false }).limit(200),
        db.from('bills').select('*').order('created_at', { ascending: false }).limit(300),
        db.from('payables').select('*').order('created_at', { ascending: false }).limit(300),
        db.from('challans').select('*').order('created_at', { ascending: false }).limit(200),
        db.from('site_requests').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const logs = logsRes.data ?? [];
      const logins = loginRes.data ?? [];
      const bills = billsRes.data ?? [];
      const payables = payRes.data ?? [];
      const challans = chalRes.data ?? [];
      const requests = reqRes.data ?? [];

      const fmt = (n: number) => n > 0 ? '₹' + Math.round(n).toLocaleString('en-IN') : '';

      const unified: ActivityRecord[] = [
        ...logs.map((l: any) => ({
          id: l.id,
          user_id: l.done_by || '-',
          user_name: l.done_by_name || '-',
          module: 'Inventory',
          action_type: l.type === 'IN' ? 'Stock In' : 'Stock Out',
          description: (l.item_name || '-') + (l.note ? ' | ' + l.note : ''),
          old_value: JSON.stringify({ qty: l.before_qty, site: l.site }),
          new_value: JSON.stringify({ qty: l.after_qty, site: l.site }),
          timestamp: l.created_at,
          site: l.site || '-',
        })),
        ...logins.map((l: any) => ({
          id: l.id,
          user_id: l.user_id || '-',
          user_name: l.user_name || l.email || '-',
          module: 'Auth',
          action_type: 'Login',
          description: 'User logged in' + (l.email ? ` (${l.email})` : ''),
          old_value: '-',
          new_value: '-',
          timestamp: l.logged_in_at,
          site: '-',
        })),
        ...bills.map((bl: any) => ({
          id: 'b' + bl.id,
          user_id: bl.created_by || '-',
          user_name: bl.created_by_name || '-',
          module: 'Bills',
          action_type: bl.bill_status || 'Added',
          description: `Bill ${bl.inv_no || '-'} | ${bl.site || '-'} | ${fmt(parseFloat(bl.amount_with_gst || bl.amount || 0))}`,
          old_value: '-',
          new_value: bl.bill_status || '-',
          timestamp: bl.created_at || bl.invoice_date,
          site: bl.site || '-',
        })),
        ...payables.map((pv: any) => ({
          id: 'p' + pv.id,
          user_id: pv.created_by || '-',
          user_name: pv.created_by || '-',
          module: 'Payables',
          action_type: pv.status || 'Added',
          description: `${pv.vendor || '-'} | ${pv.invoice_no || '-'} | ${fmt(parseFloat(pv.amount || 0))}`,
          old_value: '-',
          new_value: pv.status || '-',
          timestamp: pv.updated_at || pv.created_at,
          site: pv.site || '-',
        })),
        ...challans.map((ch: any) => ({
          id: 'c' + ch.id,
          user_id: ch.issued_by || '-',
          user_name: ch.issued_by || '-',
          module: 'Challans',
          action_type: 'Issued',
          description: `Challan ${ch.challan_no || '-'} | ${ch.item_name || '-'} | ${ch.from_site || '-'}→${ch.to_site || '-'}`,
          old_value: '-',
          new_value: 'Issued',
          timestamp: ch.created_at,
          site: ch.from_site || '-',
        })),
        ...requests.map((sr: any) => ({
          id: 'r' + sr.id,
          user_id: sr.raised_by || '-',
          user_name: sr.raised_by_name || '-',
          module: 'Requests',
          action_type: sr.request_type || 'Request',
          description: `${sr.item_name || '-'} | ${sr.requesting_site || '-'} | ${sr.status || '-'}`,
          old_value: '-',
          new_value: sr.status || '-',
          timestamp: sr.created_at,
          site: sr.requesting_site || '-',
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(unified);
    } catch (err) {
      console.error('Error fetching activity data:', err);
    }
    setLoading(false);
  }, []);

  return { activities, loading, fetch };
}
