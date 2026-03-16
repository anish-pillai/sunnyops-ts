import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Quotation } from '@/types/procurement.types';
import { QUT_STATUSES, QUT_COLORS } from '@/config/constants';
import { printQuotation } from '../utils/printQuotation';
import { Modal } from '@/components/ui/Modal';
import { QuotationFormModal } from './QuotationFormModal.tsx';

interface Props {
  quotations: Quotation[];
  loading: boolean;
  isAdmin: boolean;
  onSave: (q: Partial<Quotation>) => Promise<void>;
}

export const QuotationsSubTab: React.FC<Props> = ({ quotations, loading, isAdmin, onSave }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ type: 'new' | 'edit', q?: Quotation } | null>(null);

  const filtered = quotations.filter(q => {
    const matchesStatus = filterStatus === 'All' || q.status === filterStatus;
    const matchesSearch = !search || 
      q.ref_no.toLowerCase().includes(search.toLowerCase()) || 
      (q as any).client_name?.toLowerCase().includes(search.toLowerCase()) || 
      q.site.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getCounts = () => {
    const counts: Record<string, number> = { All: quotations.length };
    QUT_STATUSES.forEach(s => {
      counts[s] = quotations.filter(q => q.status === s).length;
    });
    return counts;
  };

  const counts = getCounts();

  if (loading && quotations.length === 0) return <Spinner />;

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>📑 Quotations</div>
        {isAdmin && (
          <Button onClick={() => setModal({ type: 'new' })} style={{ background: '#7c3aed', color: '#fff' }}>+ New Quotation</Button>
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
        {QUT_STATUSES.map(s => (
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
        placeholder="🔍 Search ref, client, site..." 
        style={{ width: '100%', maxWidth: 360, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12, fontSize: 13 }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>No quotations found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(q => {
            const sc = QUT_COLORS[q.status] || QUT_COLORS['Draft'];
            const items = Array.isArray(q.items) ? q.items : [];
            const total = items.reduce((s, it) => s + (parseFloat(String(it.rate || 0)) * parseFloat(String(it.qty || 0))), 0);
            
            return (
              <div 
                key={q.id} 
                style={{ 
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', 
                  borderLeft: `4px solid ${(q as any).type === 'BUD' ? '#f59e0b' : '#7c3aed'}`, cursor: 'pointer' 
                }}
                onClick={() => printQuotation(q)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>{q.ref_no}</span>
                      <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', background: (q as any).type === "BUD" ? "#fef3c7" : "#f5f3ff", color: (q as any).type === "BUD" ? "#92400e" : "#7c3aed", border: `1px solid ${(q as any).type === "BUD" ? "#fcd34d" : "#ddd6fe"}`, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{(q as any).type === "BUD" ? "Budgetary" : "Quotation"}</span>
                      <span style={{ background: sc.bg, border: `1px solid ${sc.br}`, color: sc.c, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>{q.status}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{(q as any).client_name || q.client || "?"}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{q.site} | {new Date(q.date || q.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>
                      ₹ {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      <Button onClick={(e) => { e.stopPropagation(); printQuotation(q); }} style={{ fontSize: 10, padding: '4px 10px' }}>⎙ Print</Button>
                      {isAdmin && (
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', q }); }} style={{ fontSize: 10, padding: '4px 10px' }}>✎ Edit</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.type === 'new' ? 'New Quotation' : `Edit Quotation: ${modal.q?.ref_no}`} wide onClose={() => setModal(null)}>
          <QuotationFormModal 
            initial={modal.q} 
            onClose={() => setModal(null)} 
            onSave={async (f: Partial<Quotation>) => {
              await onSave(f);
              setModal(null);
            }} 
          />
        </Modal>
      )}
    </div>
  );
};
