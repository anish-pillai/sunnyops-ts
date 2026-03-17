import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { STAGE_COLOURS, RECRUITMENT_STAGES } from '@/config/constants';
import { fmtDate } from '@/utils/formatters';
import type { Applicant } from '@/types/hr.types';
import { ApplicantFormModal } from './ApplicantFormModal';

interface Props {
  applicants: Applicant[];
  loading: boolean;
  onSave: (a: Omit<Applicant, 'id' | 'created_at'>, id?: string) => Promise<string | null>;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const ApplicantListSubTab: React.FC<Props> = ({ applicants, loading, onSave, showToast }) => {
  const [search, setSearch] = useState('');
  const [stageF, setStageF] = useState('');
  const [siteF, setSiteF] = useState('');
  const [modal, setModal] = useState<{ applicant?: Applicant } | null>(null);

  const sites = useMemo(() => [...new Set(applicants.map(a => a.site).filter(Boolean) as string[])].sort(), [applicants]);

  const filtered = useMemo(() => applicants.filter(a => {
    if (stageF && a.stage !== stageF) return false;
    if (siteF && a.site !== siteF) return false;
    if (search) {
      const q = search.toLowerCase();
      return (a.name || '').toLowerCase().includes(q)
        || (a.trade || '').toLowerCase().includes(q)
        || (a.phone || '').toLowerCase().includes(q)
        || (a.site || '').toLowerCase().includes(q);
    }
    return true;
  }), [applicants, search, stageF, siteF]);

  const columns: Column<Applicant>[] = [
    { header: '#', width: 40, render: (_item, idx) => <span style={{ color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{idx + 1}</span> },
    { header: 'Name', render: (a) => <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{a.name}</span> },
    { header: 'Trade', key: 'trade' },
    { header: 'Phone', key: 'phone' },
    { header: 'Site', render: (a) => <span style={{ color: '#ea580c', fontWeight: 600 }}>{a.site || '—'}</span> },
    {
      header: 'Stage', render: (a) => {
        const sc = STAGE_COLOURS[a.stage] ?? { bg: '#f8fafc', c: '#64748b', br: '#e2e8f0' };
        return <span style={{ background: sc.bg, color: sc.c, border: `1px solid ${sc.br}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{a.stage}</span>;
      }
    },
    { header: 'Source', key: 'source' },
    { header: 'Created', render: (a) => <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(a.created_at)}</span> },
  ];

  if (loading && applicants.length === 0) return <Spinner />;

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>👤 All Applicants ({applicants.length})</div>
        <Button onClick={() => setModal({})} style={{ background: '#7c3aed', color: '#fff' }}>+ New Applicant</Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search name, trade, phone..."
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, minWidth: 220 }}
        />
        <select
          value={stageF} onChange={e => setStageF(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer' }}
        >
          <option value="">All Stages</option>
          {RECRUITMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={siteF} onChange={e => setSiteF(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer' }}
        >
          <option value="">All Sites</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || stageF || siteF) && (
          <button onClick={() => { setSearch(''); setStageF(''); setSiteF(''); }}
            style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#64748b' }}>
            ✕ Clear
          </button>
        )}
      </div>

      <DataTable<Applicant>
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(a) => setModal({ applicant: a })}
        emptyMessage="No applicants found."
        initialPageSize={25}
      />

      {modal && (
        <Modal title={modal.applicant ? `Edit: ${modal.applicant.name}` : 'New Applicant'} wide onClose={() => setModal(null)}>
          <ApplicantFormModal
            initial={modal.applicant}
            onClose={() => setModal(null)}
            onSave={async (data: Omit<Applicant, 'id' | 'created_at'>, id?: string) => {
              const err = await onSave(data, id);
              if (err) { showToast(err, 'err'); return; }
              showToast(id ? 'Applicant updated' : 'Applicant added');
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};
