import { useEffect } from 'react';
import { db } from '@/config/supabase';

type RealtimeTable =
  | 'bills'
  | 'payables'
  | 'site_requests'
  | 'challans'
  | 'store_items'
  | 'purchase_orders'
  | 'inventory';

/**
 * Subscribe to Supabase Realtime for a list of tables.
 * Calls the provided callback whenever any row changes.
 *
 * Usage:
 *   useRealtime(['bills', 'payables'], () => fetchAll());
 *
 * Prerequisites: Enable Replication in Supabase Dashboard
 *   → Database → Replication → enable for each table
 */
export function useRealtime(tables: RealtimeTable[], onUpdate: () => void) {
  useEffect(() => {
    const channel = db.channel('sunnyops-realtime');

    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => onUpdate()
      );
    });

    channel.subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [tables.join(','), onUpdate]);
}
