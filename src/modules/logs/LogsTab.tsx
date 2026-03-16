import React, { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useStockLogs } from '@/hooks/useStockLogs';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { fmtDate, fmtDateTime } from '@/utils/formatters';
import type { InventoryItem, StockMovement } from '@/types/inventory.types';

export const LogsTab: React.FC = () => {
  const { items, loading: invLoading, fetch: fetchInv } = useInventory();
  const { logs, loading: logsLoading, fetchLogs } = useStockLogs();
  const [view, setView] = useState<'summary' | 'history'>('summary');

  useEffect(() => {
    fetchInv();
    fetchLogs();
  }, [fetchInv, fetchLogs]);

  const summaryColumns: Column<InventoryItem>[] = [
    { header: 'Equipment', key: 'name', render: (i) => (
      <div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{i.name}</div>
        {i.alias && <div style={{ fontSize: 10, color: '#f97316', fontWeight: 600 }}>{i.alias}</div>}
      </div>
    )},
    { header: 'Category', key: 'category' },
    { header: 'Location', key: 'site', render: (i) => (
      <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
        {i.site}
      </span>
    )},
    { header: 'Current Stock', key: 'qty', align: 'right', render: (i) => (
      <span style={{ fontWeight: 700, fontSize: 15, color: i.qty <= i.min_qty ? '#dc2626' : '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>
        {i.qty} {i.qty <= i.min_qty && <span style={{ fontSize: 9, color: '#dc2626', marginLeft: 4 }}>LOW</span>}
      </span>
    )},
    { header: 'Unit', key: 'unit' },
    { header: 'Condition', key: 'condition', render: (i) => {
      const condColor = i.condition === 'Good' ? '#16a34a' : i.condition === 'Fair' ? '#d97706' : i.condition === 'Poor' ? '#ea580c' : '#dc2626';
      return <span style={{ color: condColor, fontWeight: 600, fontSize: 11 }}>{i.condition}</span>;
    }},
    { header: 'Last Updated', key: 'updated_at', render: (i) => fmtDate(i.updated_at) }
  ];

  const historyColumns: Column<StockMovement>[] = [
    { header: 'Equipment', key: 'item_name', render: (l) => <div style={{ fontWeight: 600 }}>{l.item_name}</div> },
    { header: 'Site', key: 'site', render: (l) => (
      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
        {l.type === 'Transfer' ? `${l.from_site} → ${l.to_site}` : l.site || l.from_site || l.to_site}
      </span>
    )},
    { header: 'Type', key: 'type', render: (l) => (
      <span style={{ 
        background: l.type === 'IN' ? '#f0fdf4' : l.type === 'OUT' ? '#fef2f2' : '#eff6ff', 
        color: l.type === 'IN' ? '#16a34a' : l.type === 'OUT' ? '#dc2626' : '#1d4ed8', 
        borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 
      }}>
        {l.type}
      </span>
    )},
    { header: 'Qty', key: 'qty', align: 'right', render: (l) => <span style={{ fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{l.qty}</span> },
    { header: 'Moved By', key: 'moved_by', render: (l) => <span style={{ color: '#64748b' }}>{l.moved_by}</span> },
    { header: 'Date', key: 'moved_at', render: (l) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.moved_at)}</span> },
    { header: 'Note', key: 'reason', render: (l) => <span style={{ color: '#64748b', fontSize: 11 }}>{l.reason || '—'}</span> }
  ];

  if (invLoading || logsLoading) return <Spinner />;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
        {[
          { id: 'summary', label: '📊 Stock Summary', icon: '📊' },
          { id: 'history', label: '📜 Movement History', icon: '📜' }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setView(t.id as 'summary' | 'history')}
            style={{ 
              flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', 
              background: view === t.id ? '#f97316' : 'transparent', 
              color: view === t.id ? '#fff' : '#64748b', 
              fontWeight: 700, fontSize: 11, cursor: 'pointer', 
              fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' 
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'summary' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
              CURRENT STOCK SUMMARY
            </div>
            <Button variant="ghost" style={{ fontSize: 11 }} onClick={() => window.print()}>
              🖨️ Print / PDF
            </Button>
          </div>
          <DataTable 
            columns={summaryColumns} 
            data={items.slice().sort((a, b) => a.site.localeCompare(b.site) || a.name.localeCompare(b.name))} 
            emptyMessage="No stock records found" 
          />
        </>
      )}

      {view === 'history' && (
        <>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 2, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>
            STOCK MOVEMENT HISTORY
          </div>
          <DataTable 
            columns={historyColumns} 
            data={logs} 
            emptyMessage="No movement history found" 
          />
        </>
      )}
    </div>
  );
};
