import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable } from '@/components/ui/DataTable';
import { fmtINR, fmtDate } from '@/utils/formatters';
import { GRNEntryForm } from './components/GRNEntryForm';


interface Props {
  isAdmin: boolean;
  uName: string;
  assignedSites?: string[];
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

type StoreView = 'items' | 'history' | 'activity';

export const StoreTab: React.FC<Props> = ({ isAdmin, uName, assignedSites, showToast }) => {
  const { items, issues, loading, fetch } = useStore(assignedSites);
  const [view, setView] = useState<StoreView>('items');
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [grnModal, setGrnModal] = useState(false);

  useEffect(() => { fetch(); }, [fetch]);

  // Calculate effectiveQty for each item
  const itemsWithEffQty = useMemo(() => {
    return items.map(item => {
      // Net issued = total issued - total returned (STOCK-IN excluded)
      const itemIssues = issues.filter(iss =>
        iss.item_id === item.id && iss.work_order !== 'STOCK-IN'
      );
      const totalIssued = itemIssues
        .filter(iss => iss.type !== 'Return')
        .reduce((s, iss) => s + iss.qty, 0);
      const totalReturned = itemIssues
        .filter(iss => iss.type === 'Return')
        .reduce((s, iss) => s + iss.qty, 0);
      const netIssued = totalIssued - totalReturned;
      const effectiveQty = item.qty - netIssued;
      const isDataGap = netIssued > item.qty;

      return { ...item, effectiveQty, netIssued, isDataGap };
    });
  }, [items, issues]);

  // STOCK-IN activity entries
  const stockInActivities = useMemo(() => {
    return issues.filter(iss => iss.work_order === 'STOCK-IN');
  }, [issues]);

  // Dynamic site list
  const sitesInData = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.site) s.add(i.site); });
    return Array.from(s).sort();
  }, [items]);

  const filtered = itemsWithEffQty.filter(i => {
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchesSite = siteFilter === 'All' || i.site === siteFilter;
    return matchesSearch && matchesSite;
  });

  const totalValue = filtered.reduce((s, i) => s + (Math.max(0, i.effectiveQty) * i.unit_cost), 0);
  const totalItems = filtered.length;
  const lowStockCount = filtered.filter(i => i.effectiveQty <= i.min_qty).length;

  // By-site summary
  const bySite = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalValue: number }> = {};
    filtered.forEach(item => {
      if (!map[item.site]) map[item.site] = { count: 0, totalQty: 0, totalValue: 0 };
      map[item.site].count++;
      map[item.site].totalQty += Math.max(0, item.effectiveQty);
      map[item.site].totalValue += Math.max(0, item.effectiveQty) * item.unit_cost;
    });
    return map;
  }, [filtered]);

  const filteredIssues = useMemo(() => {
    return issues.filter(iss => iss.work_order !== 'STOCK-IN');
  }, [issues]);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
        {(['items', 'history', 'activity'] as StoreView[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', background: view === v ? '#f97316' : 'transparent', color: view === v ? '#fff' : '#64748b', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>
            {v === 'items' ? '📦 Items' : v === 'history' ? '📄 Issue History' : '📋 Stock Activity'}
          </button>
        ))}
      </div>

      {view === 'items' && (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              ['Total Items', totalItems, '#0f172a'],
              ['Low Stock', lowStockCount, '#dc2626'],
              ['Stock Value', fmtINR(totalValue), '#15803d'],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 110 }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: c as string }}>{v}</div>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* By-site summary cards */}
          {Object.keys(bySite).length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {Object.entries(bySite).map(([site, data]) => (
                <div key={site} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 14px', minWidth: 100 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c' }}>{site}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{data.count} items · {fmtINR(data.totalValue)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, minWidth: 180 }} />
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
                <option>All</option>
                {sitesInData.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && <Button onClick={() => setGrnModal(true)}>+ GRN Entry</Button>}
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Item', render: (item: any) => <span style={{ fontWeight: 700 }}>{item.name}</span> },
              { header: 'Category', key: 'category' },
              { header: 'Site', render: (item: any) => <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.site}</span> },
              { header: 'In Store', render: (item: any) => {
                const low = item.effectiveQty <= item.min_qty;
                return (
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, color: item.isDataGap ? '#dc2626' : low ? '#d97706' : '#0f172a' }}>
                    {Math.max(0, item.effectiveQty)} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>{item.unit}</span>
                    {item.isDataGap && <div style={{ fontSize: 9, color: '#dc2626', fontWeight: 500 }}>⚠ issued out (check GRN qty)</div>}
                  </div>
                );
              }, align: 'right' as const },
              { header: 'Unit Cost', render: (item: any) => <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{fmtINR(item.unit_cost)}</span>, align: 'right' as const },
              { header: 'Value', render: (item: any) => <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{fmtINR(Math.max(0, item.effectiveQty) * item.unit_cost)}</span>, align: 'right' as const },
              { header: 'Status', render: (item: any) => (
                <>
                  {item.isDataGap && <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>DATA GAP</span>}
                  {!item.isDataGap && item.effectiveQty <= item.min_qty && <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>LOW</span>}
                </>
              )},
            ]}
            data={filtered}
            emptyMessage="No store items found"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      {view === 'history' && (
        <DataTable
          columns={[
            { header: 'Item', render: (issue: any) => <span style={{ fontWeight: 700 }}>{issue.item_name}</span> },
            { header: 'Site', render: (issue: any) => <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{issue.site}</span> },
            { header: 'Qty', render: (issue: any) => <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{issue.qty}</span>, align: 'right' as const },
            { header: 'Work Order', render: (issue: any) => <span style={{ color: '#475569', fontSize: 11 }}>{issue.work_order || '—'}</span> },
            { header: 'Issued To', key: 'issued_to' },
            { header: 'Type', render: (issue: any) => issue.type ? <span style={{ background: issue.type === 'Return' ? '#f0fdf4' : issue.type === 'Transfer' ? '#eff6ff' : '#f8fafc', color: issue.type === 'Return' ? '#16a34a' : issue.type === 'Transfer' ? '#1d4ed8' : '#475569', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>{issue.type}</span> : null },
            { header: 'Purpose', render: (issue: any) => <span style={{ color: '#64748b' }}>{issue.purpose ?? '—'}</span> },
            { header: 'Date', render: (issue: any) => <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(issue.issued_at)}</span> },
            { header: 'Issued By', key: 'issued_by' },
          ]}
          data={filteredIssues}
          emptyMessage="No issues recorded"
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}

      {view === 'activity' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>📋 Stock-In Activity Log</div>
          {stockInActivities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              No stock-in activity recorded
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {stockInActivities.map(act => (
                <div key={act.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>STOCK-IN</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{act.item_name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}>{fmtDate(act.issued_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    <span style={{ fontWeight: 700 }}>{act.qty}</span> units · Site: <b>{act.site}</b> · 
                    Supplier: <b>{act.issued_to}</b> · By: <b>{act.issued_by}</b>
                    {act.purpose && <span> · {act.purpose}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GRN Entry Modal */}
      {grnModal && (
        <Modal title="📦 GRN Entry — Multi-Item" wide onClose={() => setGrnModal(false)}>
          <GRNEntryForm
            uName={uName}
            onClose={() => setGrnModal(false)}
            onSaved={fetch}
            showToast={showToast}
            existingItems={items}
          />
        </Modal>
      )}
    </div>
  );
};
