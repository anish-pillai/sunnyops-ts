import React, { useEffect, useState, useMemo } from 'react';
import { useBillAudit } from '@/hooks/useBillAudit';
import { Spinner } from '@/components/ui/Spinner';
import { fmtDate } from '@/utils/formatters';

const ACTION_COLORS: Record<string, { bg: string; c: string }> = {
  CREATED:         { bg: '#f0fdf4', c: '#16a34a' },
  EDITED:          { bg: '#eff6ff', c: '#1d4ed8' },
  DELETED:         { bg: '#fef2f2', c: '#dc2626' },
  IMPORTED:        { bg: '#faf5ff', c: '#7c3aed' },
  'IMPORT-UPDATE': { bg: '#fff7ed', c: '#ea580c' },
};

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
  { label: 'All time', days: 0 },
];

const FIELD_LABELS: Record<string, string> = {
  amount: 'Amount',
  amount_with_gst: 'Amount (Incl GST)',
  amount_credited: 'Amount Credited',
  tds: 'TDS',
  tds_on_gst: 'TDS on GST',
  security_deposit: 'Security Deposit',
  hra_deduction: 'HRA Deduction',
  gst_hold: 'GST Hold',
  other_deductions: 'Other Deductions',
  credit_note: 'Credit Note',
  credit_note2: 'Credit Note 2',
  sd_received: 'SD Received',
  hra_received: 'HRA Received',
  gst_received: 'GST Received',
  others_received: 'Others Received',
  fines_penalty: 'Fines & Penalties',
  fines_received: 'Fines Received',
  dlp_hold: 'DLP Hold',
  dlp_received: 'DLP Received',
  retention_hold: 'Retention Hold',
  retention_received: 'Retention Received',
  bill_status: 'Status',
  bill_details: 'Description',
  inv_no: 'Invoice No',
  wo_no: 'WO No',
  site: 'Site',
  remarks: 'Remarks',
};

const fmtFieldVal = (val: any): string => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') return '₹' + val.toLocaleString('en-IN');
  return String(val);
};

export const BillAuditLog: React.FC = () => {
  const { entries, loading, fetchAuditLog } = useBillAudit();
  const [actionFilter, setActionFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return entries.filter(e => {
      if (actionFilter !== 'All' && e.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(e.inv_no || '').toLowerCase().includes(q) &&
            !(e.done_by || '').toLowerCase().includes(q)) return false;
      }
      if (dateRange > 0) {
        const age = now - new Date(e.created_at).getTime();
        if (age > dateRange * 86400000) return false;
      }
      return true;
    });
  }, [entries, actionFilter, search, dateRange]);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search invoice / user..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, minWidth: 180 }}
        />
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}
        >
          <option>All</option>
          {['CREATED', 'EDITED', 'DELETED', 'IMPORTED', 'IMPORT-UPDATE'].map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          value={dateRange}
          onChange={e => setDateRange(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}
        >
          {DATE_RANGES.map(r => (
            <option key={r.days} value={r.days}>{r.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}>
          {filtered.length} entries
        </span>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          No audit entries found
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(e => {
            const ac = ACTION_COLORS[e.action] || { bg: '#f1f5f9', c: '#475569' };
            const changes = e.changed_fields || {};
            return (
              <div key={e.id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '12px 16px', borderLeft: `4px solid ${ac.c}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: ac.bg, color: ac.c, borderRadius: 20,
                      padding: '2px 10px', fontSize: 10, fontWeight: 700,
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}>
                      {e.action}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {e.inv_no || '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {fmtDate(e.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                  by <b>{e.done_by}</b> ({e.done_by_role})
                </div>
                {Object.keys(changes).length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(changes).map(([key, val]: [string, any]) => (
                      <span key={key} style={{
                        fontSize: 10, background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 4, padding: '2px 8px', color: '#475569',
                      }}>
                        {FIELD_LABELS[key] || key}: {fmtFieldVal(val?.old)} → {fmtFieldVal(val?.new)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
