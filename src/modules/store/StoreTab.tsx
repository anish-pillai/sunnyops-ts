import React, { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { fmtINR, fmtDate } from '@/utils/formatters';


interface Props {
  isAdmin: boolean;
  uName: string;
  assignedSites?: string[];
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const StoreTab: React.FC<Props> = ({ isAdmin, assignedSites, showToast }) => {
  const { items, issues, loading, fetch } = useStore(assignedSites);
  const [view, setView] = useState<'items' | 'history'>('items');
  const [search, setSearch] = useState('');

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const totalValue = items.reduce((s, i) => s + (i.qty * i.unit_cost), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
        {['items', 'history'].map(v => (
          <button key={v} onClick={() => setView(v as 'items' | 'history')}
            style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', background: view === v ? '#f97316' : 'transparent', color: view === v ? '#fff' : '#64748b', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>
            {v === 'items' ? '📦 Items' : '📄 Issue History'}
          </button>
        ))}
      </div>

      {view === 'items' && (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['Total Items', items.length, '#0f172a'], ['Low Stock', items.filter(i => i.qty <= i.min_qty).length, '#dc2626'], ['Stock Value', fmtINR(totalValue), '#15803d']].map(([l, v, c]) => (
              <div key={l as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 110 }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: c as string }}>{v}</div>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'space-between' }}>
            <input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, minWidth: 180 }} />
            {isAdmin && <Button onClick={() => showToast('Add item modal — connect to StoreItemForm', 'err')}>+ Add Item</Button>}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Item', 'Category', 'Site', 'Qty', 'Unit Cost', 'Value', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const low = item.qty <= item.min_qty;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{item.name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{item.category}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.site}</span></td>
                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, color: low ? '#dc2626' : '#0f172a' }}>{item.qty} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>{item.unit}</span></td>
                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace' }}>{fmtINR(item.unit_cost)}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{fmtINR(item.qty * item.unit_cost)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {low && <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>LOW</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'history' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Item', 'Site', 'Qty', 'Issued To', 'Purpose', 'Date', 'Issued By'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.length === 0
                ? <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No issues recorded</td></tr>
                : issues.map(issue => (
                  <tr key={issue.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{issue.item_name}</td>
                    <td style={{ padding: '12px 14px' }}><span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{issue.site}</span></td>
                    <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{issue.qty}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{issue.issued_to}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{issue.purpose ?? '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(issue.issued_at)}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{issue.issued_by}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
