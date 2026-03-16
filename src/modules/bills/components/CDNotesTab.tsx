import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import type { CreditDebitNote, EInvoice, Bill } from '@/types/bill.types';
import { fmtDate } from '@/utils/formatters';
import { printCdnNote } from '@/utils/print';
import {
  FIRMS, EI_CLIENTS, CDN_STATUSES, CDN_STATUS_COLORS, CDN_REASONS,
} from '@/config/constants';

interface Props {
  cdNotes: CreditDebitNote[];
  einvoices: EInvoice[];
  bills: Bill[];
  loading: boolean;
  isAdmin: boolean;
  uName: string;
  showToast?: (msg: string, type?: 'ok' | 'err') => void;
  onSave: (note: Partial<CreditDebitNote>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────

function nextCdnNo(type: string, firm: string, existing: CreditDebitNote[]): string {
  const prefix = (firm === 'opc' ? 'PSEC' : 'PSC') + '/' + (type === 'Credit' ? 'CN' : 'DN');
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const s = m >= 3 ? y : y - 1;
  const fy = s.toString().slice(2) + '-' + (s + 1).toString().slice(2);
  const pat = new RegExp('^' + prefix.replace('/', '\\/') + '\\/' + fy + '\\/(\\d+)$');
  const nums = existing
    .filter(n => n.note_type === type && n.firm === firm)
    .map(n => { const mt = (n.note_no || '').match(pat); return mt ? parseInt(mt[1]) : 0; })
    .filter(x => x > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return prefix + '/' + fy + '/' + String(next).padStart(3, '0');
}

function fmtC(n: number | string | undefined): string {
  return '₹' + parseFloat(String(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Component ────────────────────────────────────────────────────────

export const CDNotesTab: React.FC<Props> = ({
  cdNotes, einvoices, bills: _bills, loading, isAdmin, uName: _uName,
  showToast = () => {}, onSave, onDelete: _onDelete
}) => {
  const canEdit = isAdmin;
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('All');
  const [fStatus, setFStatus] = useState('All');
  const [modal, setModal] = useState<'form' | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const BLANK: Record<string, any> = {
    note_type: 'Credit', firm: 'opc', ref_inv_no: '', ref_inv_id: null, ref_inv_date: '',
    client_name: '', site: '', note_date: new Date().toISOString().slice(0, 10),
    reason: '', description: '', taxable_value: '', gst_percent: '18',
    gst_amount: '', total_amount: '', irn: '', remarks: '', status: 'Draft'
  };

  // ── Form helpers ───────────────────────────────────────────────────

  const recalc = (frm: Record<string, any>) => {
    const tv = parseFloat(frm.taxable_value || 0);
    const gp = parseFloat(frm.gst_percent || 18);
    const ga = Math.round(tv * gp / 100 * 100) / 100;
    const tot = Math.round((tv + ga) * 100) / 100;
    return { ...frm, gst_amount: ga.toFixed(2), total_amount: tot.toFixed(2) };
  };

  const sf = (k: string, v: any) => {
    setForm(p => {
      const nx = { ...p, [k]: v };
      if (k === 'taxable_value' || k === 'gst_percent') return recalc(nx);
      return nx;
    });
  };

  const pickRefInv = (invNo: string) => {
    const inv = einvoices.find(e => (e.inv_no || e.invoice_no) === invNo);
    if (!inv) { sf('ref_inv_no', invNo); return; }
    setForm(p => {
      const nx: Record<string, any> = {
        ...p,
        ref_inv_no: inv.inv_no || inv.invoice_no,
        ref_inv_id: inv.id,
        ref_inv_date: inv.invoice_date || '',
        client_name: inv.client_name || '',
        site: inv.site || '',
        firm: inv.firm || 'opc',
        gst_percent: String(inv.gst_percent || 18),
        bill_id: inv.bill_id || null,
      };
      if (p.note_type === 'Credit') nx.taxable_value = String(inv.taxable_value || inv.sub_total || '');
      return recalc(nx);
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────

  const filtered = cdNotes.filter(n =>
    (fType === 'All' || n.note_type === fType) &&
    (fStatus === 'All' || n.status === fStatus) &&
    (!search ||
      (n.note_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.ref_inv_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.client_name || '').toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = (type: 'Credit' | 'Debit') => {
    setForm({ ...BLANK, note_type: type, note_no: nextCdnNo(type, 'opc', cdNotes) });
    setModal('form');
  };

  const openEdit = (n: CreditDebitNote) => {
    setForm({ ...BLANK, ...n });
    setModal('form');
  };

  const saveNote = async () => {
    if (!form.ref_inv_no) { showToast('Enter reference invoice number', 'err'); return; }
    if (!form.taxable_value || parseFloat(form.taxable_value) <= 0) { showToast('Enter taxable value', 'err'); return; }

    setSaving(true);
    const payload: Partial<CreditDebitNote> = {
      ...form,
      taxable_value: parseFloat(form.taxable_value || 0),
      gst_amount: parseFloat(form.gst_amount || 0),
      total_amount: parseFloat(form.total_amount || 0),
      gst_percent: parseFloat(form.gst_percent || 18),
      note_no: form.note_no || nextCdnNo(form.note_type, form.firm, cdNotes),
    };

    try {
      await onSave(payload, form.id);
      showToast(form.id ? 'Note updated ✔' : 'Note created ✔');
      setModal(null);
    } catch {
      showToast('Save error', 'err');
    } finally {
      setSaving(false);
    }
  };

  // ── Summary stats ──────────────────────────────────────────────────

  const cnCount = cdNotes.filter(n => n.note_type === 'Credit').length;
  const dnCount = cdNotes.filter(n => n.note_type === 'Debit').length;
  const totalCN = filtered.filter(n => n.note_type === 'Credit').reduce((s, n) => s + parseFloat(String(n.total_amount || 0)), 0);
  const totalDN = filtered.filter(n => n.note_type === 'Debit').reduce((s, n) => s + parseFloat(String(n.total_amount || 0)), 0);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'Credit Notes', v: cnCount, c: '#dc2626' },
          { l: 'Total CN Value', v: fmtC(totalCN), c: '#dc2626' },
          { l: 'Debit Notes', v: dnCount, c: '#2563eb' },
          { l: 'Total DN Value', v: fmtC(totalDN), c: '#2563eb' },
        ].map(item => (
          <div key={item.l} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{item.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.c, fontFamily: 'IBM Plex Mono, monospace' }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input placeholder="Search note no / invoice / client..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 11, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace', flex: 1, minWidth: 180 }} />
        <select value={fType} onChange={e => setFType(e.target.value)}
          style={{ fontSize: 11, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>
          {[['All', 'All Types'], ['Credit', 'Credit Notes'], ['Debit', 'Debit Notes']].map(([k, v]) =>
            <option key={k} value={k}>{v}</option>
          )}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}
          style={{ fontSize: 11, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>
          <option value="All">All Status</option>
          {CDN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {canEdit && <>
          <Button onClick={() => openNew('Credit')} variant="danger" style={{ fontSize: 11 }}>＋ Credit Note</Button>
          <Button onClick={() => openNew('Debit')} style={{ fontSize: 11, background: '#2563eb' }}>＋ Debit Note</Button>
        </>}
      </div>

      {/* Table */}
      <DataTable
        loading={loading}
        data={filtered}
        emptyMessage="No credit/debit notes yet."
        columns={[
          { header: 'Type', render: (n) => {
            const isCredit = n.note_type === 'Credit';
            return (
              <span style={{
                background: isCredit ? '#fef2f2' : '#eff6ff',
                color: isCredit ? '#dc2626' : '#2563eb',
                border: '1px solid ' + (isCredit ? '#fecaca' : '#bfdbfe'),
                borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 800,
                fontFamily: 'IBM Plex Mono, monospace'
              }}>{isCredit ? 'CN' : 'DN'}</span>
            );
          }},
          { header: 'Note No', render: (n) => {
            const isCredit = n.note_type === 'Credit';
            return <span style={{ fontWeight: 700, color: isCredit ? '#dc2626' : '#2563eb', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{n.note_no}</span>;
          }},
          { header: 'Ref Invoice', render: (n) => <span style={{ fontSize: 10, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace' }}>{n.ref_inv_no || '—'}</span> },
          { header: 'Client', render: (n) => n.client_name || '—' },
          { header: 'Site', render: (n) => <span style={{ fontSize: 10, color: '#64748b' }}>{n.site || '—'}</span> },
          { header: 'Date', render: (n) => fmtDate(n.note_date) },
          { header: 'Taxable', render: (n) => fmtC(n.taxable_value), align: 'right' },
          { header: 'Total', render: (n) => {
            const isCredit = n.note_type === 'Credit';
            return <span style={{ fontWeight: 700, color: isCredit ? '#dc2626' : '#2563eb' }}>{fmtC(n.total_amount)}</span>;
          }, align: 'right' },
          { header: 'Status', render: (n) => {
            const sc = CDN_STATUS_COLORS[n.status] || CDN_STATUS_COLORS['Draft'];
            return <span style={{ background: sc.bg, border: '1px solid ' + sc.br, color: sc.c, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{n.status}</span>;
          }},
          { header: 'IRN', render: (n) => n.irn ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 9 }}>✔ Yes</span> : <span style={{ color: '#94a3b8', fontSize: 9 }}>—</span> },
          { header: '', render: (n) => (
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <Button variant="ghost" style={{ fontSize: 9, padding: '3px 8px', height: 'auto', background: '#0f172a', color: '#fff' }} onClick={() => printCdnNote(n)}>🖨 Print</Button>
              {canEdit && <Button variant="ghost" style={{ fontSize: 9, padding: '3px 8px', height: 'auto' }} onClick={() => openEdit(n)}>Edit</Button>}
            </div>
          )},
        ]}
      />

      {/* ── Form Modal ──────────────────────────────────────────────── */}
      {modal === 'form' && (
        <Modal
          title={(form.id ? 'Edit' : 'New') + (form.note_type === 'Credit' ? ' Credit Note' : ' Debit Note') + ' — ' + (form.note_no || 'Auto')}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Note type selector */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1.5, marginBottom: 6 }}>NOTE TYPE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Credit', 'Debit'] as const).map(t => {
                  const active = form.note_type === t;
                  const col = t === 'Credit' ? '#dc2626' : '#2563eb';
                  return (
                    <button key={t} onClick={() => {
                      const nn = form.id ? form.note_no : nextCdnNo(t, form.firm || 'opc', cdNotes);
                      setForm(p => ({ ...p, note_type: t, note_no: nn }));
                    }} style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: '2px solid ' + (active ? col : '#e2e8f0'),
                      background: active ? (t === 'Credit' ? '#fef2f2' : '#eff6ff') : '#f8fafc',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      color: active ? col : '#64748b'
                    }}>
                      {t === 'Credit' ? '📉 Credit Note' : '📈 Debit Note'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference invoice */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#f97316', letterSpacing: 1, marginBottom: 4 }}>REFERENCE INVOICE *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input list="cdn-inv-list" value={form.ref_inv_no || ''} onChange={e => pickRefInv(e.target.value)}
                  placeholder="Type or select original invoice no..." style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #fed7aa',
                    fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', background: '#fff7ed'
                  }} />
                <datalist id="cdn-inv-list">
                  {einvoices.map(e => <option key={e.id} value={e.inv_no || e.invoice_no}>{(e.inv_no || e.invoice_no) + ' — ' + e.client_name}</option>)}
                </datalist>
              </div>
              {form.ref_inv_no && einvoices.find(e => (e.inv_no || e.invoice_no) === form.ref_inv_no) && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 10, color: '#15803d' }}>
                  ✔ Invoice found — {form.client_name}{form.bill_id ? ' | Bill will be cancelled' : ''}
                </div>
              )}
            </div>

            {/* Firm */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>ISSUING FIRM</div>
              <select value={form.firm || 'opc'} onChange={e => sf('firm', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                {FIRMS.map(fi => <option key={fi.key} value={fi.key}>{fi.key === 'opc' ? 'OPC' : 'Prop'} ({fi.gst})</option>)}
              </select>
            </div>

            {/* Note date */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>NOTE DATE *</div>
              <input type="date" value={form.note_date || ''} onChange={e => sf('note_date', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>

            {/* Client */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>CLIENT</div>
              <select value={form.client_name || ''} onChange={e => sf('client_name', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                <option value="">Select...</option>
                {EI_CLIENTS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Site */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SITE</div>
              <input value={form.site || ''} onChange={e => sf('site', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>

            {/* Reason */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>REASON *</div>
              <select value={form.reason || ''} onChange={e => sf('reason', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                <option value="">Select reason...</option>
                {CDN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>DESCRIPTION</div>
              <textarea value={form.description || ''} onChange={e => sf('description', e.target.value)} placeholder="Additional description..."
                rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', resize: 'vertical' }} />
            </div>

            {/* Taxable / GST% / GST Amount */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>TAXABLE VALUE (₹) *</div>
              <input type="number" value={form.taxable_value || ''} onChange={e => sf('taxable_value', e.target.value)} placeholder="0.00"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>GST %</div>
              <select value={form.gst_percent || '18'} onChange={e => sf('gst_percent', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                {['5', '12', '18', '28'].map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#0369a1', letterSpacing: 1, marginBottom: 4 }}>GST AMOUNT (AUTO)</div>
              <input readOnly value={'₹ ' + parseFloat(form.gst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }} />
            </div>

            {/* Total */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{
                background: form.note_type === 'Credit' ? '#fef2f2' : '#eff6ff',
                border: '1px solid ' + (form.note_type === 'Credit' ? '#fecaca' : '#bfdbfe'),
                borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: form.note_type === 'Credit' ? '#dc2626' : '#2563eb', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {form.note_type === 'Credit' ? 'CREDIT AMOUNT' : 'DEBIT AMOUNT'}
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: form.note_type === 'Credit' ? '#dc2626' : '#2563eb', fontFamily: 'IBM Plex Mono, monospace' }}>
                  ₹ {parseFloat(form.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* IRN / Status / Remarks */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>IRN (GST PORTAL)</div>
              <input value={form.irn || ''} onChange={e => sf('irn', e.target.value)} placeholder="64-char IRN hash"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>STATUS</div>
              <select value={form.status || 'Draft'} onChange={e => sf('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                {CDN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>REMARKS</div>
              <input value={form.remarks || ''} onChange={e => sf('remarks', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>

            {/* Warning banners */}
            {form.note_type === 'Credit' && form.bill_id && (
              <div style={{ gridColumn: '1 / -1', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 10, color: '#dc2626' }}>
                ⚠️ When status is set to 'IRN Obtained', the linked Bill #{form.bill_id} will automatically be marked as CANCELLED.
              </div>
            )}
            {form.note_type === 'Credit' && !form.bill_id && (
              <div style={{ gridColumn: '1 / -1', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 10, color: '#92400e' }}>
                ℹ Reference invoice was not pushed to Bills — no bill will be cancelled.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button onClick={saveNote} loading={saving} style={{
              flex: 1, padding: '10px 0',
              background: form.note_type === 'Credit' ? '#dc2626' : '#2563eb'
            }}>
              {saving ? 'Saving...' : form.id ? '✔ Update Note' : '✔ Create ' + form.note_type + ' Note'}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0' }}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
