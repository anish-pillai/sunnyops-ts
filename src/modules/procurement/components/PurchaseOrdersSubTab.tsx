import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PurchaseOrder } from '@/types/procurement.types';
import { PO_STATUSES, PO_STATUS_COLORS } from '@/config/constants';
import { printPO } from '../utils/printPO';
import { Modal } from '@/components/ui/Modal';
import { POFormModal } from './POFormModal.tsx';

interface Props {
  pos: PurchaseOrder[];
  loading: boolean;
  isAdmin: boolean;
  canFinalize?: boolean;
  userRole?: string;
  uName?: string;
  onSave: (po: Partial<PurchaseOrder>) => Promise<void>;
}

export const PurchaseOrdersSubTab: React.FC<Props> = ({ pos, loading, isAdmin, canFinalize = false, uName, onSave }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ type: 'new' | 'edit', po?: PurchaseOrder } | null>(null);

  const filtered = pos.filter(p => {
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    const matchesSearch = !search || 
      (p.po_no || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.vendor_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.site || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getCounts = () => {
    const counts: Record<string, number> = { All: pos.length };
    PO_STATUSES.forEach(s => {
      counts[s] = pos.filter(p => p.status === s).length;
    });
    return counts;
  };

  const counts = getCounts();

  if (loading && pos.length === 0) return <Spinner />;

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>🛒 Purchase Orders</div>
        {isAdmin && (
          <Button onClick={() => setModal({ type: 'new' })} style={{ background: '#7c3aed', color: '#fff' }}>+ New PO</Button>
        )}
        {!canFinalize && (
          <div style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔒 Finalise requires Director / Admin approval
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <button 
          onClick={() => setFilterStatus('All')} 
          style={{ 
            fontSize: 10, padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0', 
            background: filterStatus === 'All' ? '#0f172a' : '#fff', 
            color: filterStatus === 'All' ? '#fff' : '#64748b', 
            cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 
          }}
        >
          All ({counts.All})
        </button>
        {PO_STATUSES.map(s => (
          <button 
            key={s} 
            onClick={() => setFilterStatus(s)} 
            style={{ 
              fontSize: 10, padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0', 
              background: filterStatus === s ? '#0f172a' : '#fff', 
              color: filterStatus === s ? '#fff' : '#64748b', 
              cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 
            }}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <input 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder="🔍 Search PO no., vendor, site..." 
        style={{ width: '100%', maxWidth: 360, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12, fontSize: 13 }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>No purchase orders found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(po => {
            const sc = PO_STATUS_COLORS[po.status] || PO_STATUS_COLORS['Draft'];
            return (
              <div 
                key={po.id} 
                style={{ 
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', 
                  borderLeft: `4px solid ${po.status === 'Draft' ? '#94a3b8' : '#7c3aed'}`, cursor: 'pointer' 
                }}
                onClick={() => printPO(po)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>{po.po_no}</span>
                      <span style={{ background: sc.bg, border: `1px solid ${sc.br}`, color: sc.c, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>{po.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      <span>Site: <b style={{ color: '#f97316' }}>{po.site}</b></span>
                      <span>Vendor: <b>{po.vendor_name}</b></span>
                      <span>{new Date(po.date || po.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>
                      ₹ {(po.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Button onClick={(e) => { e.stopPropagation(); printPO(po); }} style={{ fontSize: 10, padding: '4px 10px' }}>⎙ Print</Button>
                    {isAdmin && (
                      <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', po }); }} style={{ fontSize: 10, padding: '4px 10px' }}>✎ Edit</Button>
                    )}
                    {po.status === 'Draft' && canFinalize && (
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Finalise PO ${po.po_no}?`)) return;
                          await onSave({ ...po, status: 'Pending Purchase', signed_by: uName || '', signed_at: new Date().toISOString() });
                        }}
                        style={{ fontSize: 10, padding: '4px 10px', background: '#16a34a', color: '#fff' }}
                      >
                        ✓ Finalise
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.type === 'new' ? 'New Purchase Order' : `Edit PO: ${modal.po?.po_no}`} wide onClose={() => setModal(null)}>
          <POFormModal 
            initial={modal.po} 
            canFinalize={canFinalize}
            onClose={() => setModal(null)} 
            onSave={async (f: Partial<PurchaseOrder>) => {
              await onSave(f);
              setModal(null);
            }} 
          />
        </Modal>
      )}
    </div>
  );
};
