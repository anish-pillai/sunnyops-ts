import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import type { EInvoice, EInvoiceLineItem, WorkOrder } from '@/types/bill.types';
import { fmtDate } from '@/utils/formatters';
import { printEInvoice } from '@/utils/print';
import {
  FIRMS, EI_CLIENTS, EI_HSN_CODES, EI_DEFAULT_HSN, EI_UNITS,
  EI_STATUSES, EI_STATUS_COLORS, DEFAULT_SITE_DETAILS,
} from '@/config/constants';

interface Props {
  einvoices: EInvoice[];
  loading: boolean;
  isAdmin: boolean;
  uName: string;
  workOrders?: WorkOrder[];
  showToast?: (msg: string, type?: 'ok' | 'err') => void;
  onSave: (ei: Partial<EInvoice>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPushToBills: (ei: EInvoice) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────

function blankItem(): EInvoiceLineItem {
  return { id: Date.now() + Math.random(), desc: '', hsn: EI_DEFAULT_HSN, qty: 1, unit: 'LS', rate: '', amount: 0 };
}

function calcItemAmt(item: EInvoiceLineItem): number {
  return Math.round(Number(item.qty || 0) * Number(item.rate || 0) * 100) / 100;
}

function getFinYear(): string {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const s = m >= 3 ? y : y - 1;
  return s.toString().slice(2) + '-' + (s + 1).toString().slice(2);
}

function nextEINo(firm: string, existing: EInvoice[]): string {
  const prefix = firm === 'opc' ? 'PSEC' : 'PSC';
  const fy = getFinYear();
  const pat = new RegExp('^' + prefix + '/' + fy + '/(\\d+)$');
  const nums = existing
    .filter(e => e.firm === firm)
    .map(e => { const m = (e.inv_no || e.invoice_no || '').match(pat); return m ? parseInt(m[1]) : 0; })
    .filter(n => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return prefix + '/' + fy + '/' + String(next).padStart(3, '0');
}

function fmtC(n: number | string | undefined): string {
  return '₹' + parseFloat(String(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);

// ── Component ────────────────────────────────────────────────────────

export const EInvoiceTab: React.FC<Props> = ({
  einvoices, loading, isAdmin, uName: _uName, workOrders = [],
  showToast = () => {}, onSave, onDelete: _onDelete, onPushToBills
}) => {
  const canEdit = isAdmin;
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('All');
  const [fFirm, setFFirm] = useState('All');
  const [modal, setModal] = useState<'form' | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // ── Form helpers ───────────────────────────────────────────────────

  const computeTaxable = (items: EInvoiceLineItem[]) =>
    items.reduce((s, it) => s + parseFloat(String(it.amount || calcItemAmt(it) || 0)), 0);

  const recalcTotals = (frm: Record<string, any>): Record<string, any> => {
    const tv = computeTaxable(frm.line_items || []);
    const gp = parseFloat(frm.gst_percent || 18);
    const ga = Math.round(tv * gp / 100 * 100) / 100;
    const tot = Math.round((tv + ga - parseFloat(frm.tds_amount || 0)) * 100) / 100;
    return { ...frm, taxable_value: tv.toFixed(2), gst_amount: ga.toFixed(2), total_amount: tot.toFixed(2) };
  };

  const sf = (k: string, v: any) => {
    setForm(p => {
      const nx = { ...p, [k]: v };
      if (k === 'gst_percent' || k === 'tds_amount') return recalcTotals(nx);
      return nx;
    });
  };

  const updateItem = (idx: number, key: string, val: string | number) => {
    setForm(p => {
      const items = (p.line_items || []).map((it: EInvoiceLineItem, i: number) => {
        if (i !== idx) return it;
        const nx = { ...it, [key]: val };
        if (key === 'qty' || key === 'rate') nx.amount = String(calcItemAmt({ ...nx, [key]: val } as EInvoiceLineItem));
        return nx;
      });
      return recalcTotals({ ...p, line_items: items });
    });
  };

  const addItem = () => {
    setForm(p => recalcTotals({ ...p, line_items: [...(p.line_items || []), blankItem()] }));
  };

  const removeItem = (idx: number) => {
    setForm(p => {
      if ((p.line_items || []).length <= 1) { showToast('At least one line item required', 'err'); return p; }
      return recalcTotals({ ...p, line_items: (p.line_items || []).filter((_: any, i: number) => i !== idx) });
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────

  const filtered = einvoices.filter(e =>
    (fStatus === 'All' || e.status === fStatus) &&
    (fFirm === 'All' || e.firm === fFirm) &&
    (!search ||
      (e.inv_no || e.invoice_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.wo_no || '').toLowerCase().includes(search.toLowerCase()))
  );

  // ── Open helpers ───────────────────────────────────────────────────

  const BLANK = {
    firm: 'opc', client_name: '', wo_no: '', site: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    gst_percent: '18', tds_amount: '', irn: '', eway_bill: '',
    remarks: '', status: 'Draft', line_items: [blankItem()]
  };

  const openNew = () => {
    setForm({ ...BLANK, inv_no: nextEINo('opc', einvoices), line_items: [blankItem()] });
    setModal('form');
  };

  const openEdit = (e: EInvoice) => {
    let items: EInvoiceLineItem[] = [];
    try {
      items = typeof e.line_items === 'string' ? JSON.parse(e.line_items) : (e.line_items || e.items || []);
    } catch { /* empty */ }
    if (!items.length) items = [blankItem()];
    setForm({ ...BLANK, ...e, inv_no: e.inv_no || e.invoice_no, line_items: items });
    setModal('form');
  };

  // ── Save ───────────────────────────────────────────────────────────

  const saveInvoice = async () => {
    if (!form.client_name) { showToast('Select a client', 'err'); return; }
    const items = form.line_items || [];
    const hasEmpty = items.some((it: any) => !(it.desc || '').trim() || !parseFloat(it.rate || 0));
    if (hasEmpty) { showToast('Fill description & rate for all line items', 'err'); return; }

    setSaving(true);
    const recalcd = recalcTotals(form);
    const invNo = form.inv_no || nextEINo(recalcd.firm || 'opc', einvoices);

    const payload: Partial<EInvoice> = {
      inv_no: invNo,
      invoice_no: invNo,
      firm: recalcd.firm || 'opc',
      client_name: recalcd.client_name || '',
      wo_no: recalcd.wo_no || '',
      site: recalcd.site || '',
      invoice_date: recalcd.invoice_date || null,
      taxable_value: parseFloat(recalcd.taxable_value || 0),
      gst_type: recalcd.gst_type || 'IGST',
      gst_percent: parseFloat(recalcd.gst_percent || 18),
      gst_amount: parseFloat(recalcd.gst_amount || 0),
      total_amount: parseFloat(recalcd.total_amount || 0),
      sub_total: parseFloat(recalcd.taxable_value || 0),
      grand_total: parseFloat(recalcd.total_amount || 0),
      tds_amount: parseFloat(recalcd.tds_amount || 0),
      irn: recalcd.irn || '',
      eway_bill: recalcd.eway_bill || '',
      status: recalcd.status || 'Draft',
      description: recalcd.description || '',
      remarks: recalcd.remarks || '',
      line_items: JSON.stringify(items) as any,
    };

    try {
      await onSave(payload, form.id);
      showToast(form.id ? 'Invoice updated ✔' : 'Invoice created ✔');
      setModal(null);
    } catch {
      showToast('Save error', 'err');
    } finally {
      setSaving(false);
    }
  };

  // ── Summary stats ──────────────────────────────────────────────────

  const totalTaxable = filtered.reduce((s, e) => s + parseFloat(String(e.taxable_value || e.sub_total || 0)), 0);
  const totalInvoiced = filtered.reduce((s, e) => s + parseFloat(String(e.total_amount || e.grand_total || 0)), 0);
  const irnCount = filtered.filter(e => e.irn).length;
  const pushedCount = filtered.filter(e => e.status === 'Pushed to Bills').length;

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 6, border: '1px solid #e2e8f0', padding: '5px 8px',
    fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', background: '#fff', ...extra
  });

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'Total Invoices', v: filtered.length, c: '#f97316' },
          { l: 'Taxable Value', v: fmtC(totalTaxable), c: '#0369a1' },
          { l: 'Invoice Total', v: fmtC(totalInvoiced), c: '#7c3aed' },
          { l: 'IRN Obtained', v: irnCount, c: '#16a34a' },
          { l: 'Pushed to Bills', v: pushedCount, c: '#ea580c' },
        ].map(item => (
          <div key={item.l} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{item.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.c, fontFamily: 'IBM Plex Mono, monospace' }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input placeholder="Search invoice / client / WO..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 11, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace', flex: 1, minWidth: 180 }} />
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}
          style={{ fontSize: 11, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>
          <option value="All">All Status</option>
          {EI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fFirm} onChange={e => setFFirm(e.target.value)}
          style={{ fontSize: 11, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>
          {[['All', 'All Firms'], ['opc', 'OPC'], ['prop', 'Prop']].map(([k, v]) =>
            <option key={k} value={k}>{v}</option>
          )}
        </select>
        {canEdit && <Button onClick={openNew} style={{ fontSize: 11 }}>＋ New Invoice</Button>}
      </div>

      {/* Table */}
      <DataTable
        loading={loading}
        data={filtered}
        emptyMessage="No e-invoices yet. Click '＋ New Invoice' to raise one."
        rowStyle={(inv) => ({ background: inv.status === 'Pushed to Bills' ? '#f0fdf4' : '#fff' })}
        columns={[
          { header: 'Inv No', render: (inv) => (
            <span style={{ fontWeight: 700, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
              {inv.inv_no || inv.invoice_no}
              <span style={{ marginLeft: 5, fontSize: 8, background: '#e2e8f0', padding: '1px 5px', borderRadius: 3, color: '#64748b' }}>
                {inv.firm === 'prop' ? 'PSC' : 'OPC'}
              </span>
            </span>
          )},
          { header: 'Client', render: (inv) => inv.client_name || '—' },
          { header: 'WO', render: (inv) => <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{inv.wo_no || '—'}</span> },
          { header: 'Site', render: (inv) => <span style={{ fontSize: 10, color: '#64748b' }}>{inv.site || '—'}</span> },
          { header: 'Date', render: (inv) => fmtDate(inv.invoice_date) },
          { header: 'Items', render: (inv) => {
            let cnt = 0;
            try { const li = typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : (inv.line_items || inv.items || []); cnt = li.length; } catch { /* empty */ }
            return <span style={{ background: '#f1f5f9', borderRadius: 20, padding: '2px 7px', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', color: '#475569' }}>{cnt} line{cnt !== 1 ? 's' : ''}</span>;
          }},
          { header: 'Taxable', render: (inv) => fmtC(inv.taxable_value ?? inv.sub_total), align: 'right' },
          { header: 'Total', render: (inv) => <span style={{ fontWeight: 700 }}>{fmtC(inv.total_amount ?? inv.grand_total)}</span>, align: 'right' },
          { header: 'Status', render: (inv) => {
            const sc = EI_STATUS_COLORS[inv.status] || EI_STATUS_COLORS['Draft'];
            return <span style={{ background: sc.bg, border: '1px solid ' + sc.br, color: sc.c, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>{inv.status}</span>;
          }},
          { header: 'IRN', render: (inv) => inv.irn ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 9 }}>✔</span> : <span style={{ color: '#94a3b8', fontSize: 9 }}>—</span> },
          { header: '', render: (inv) => (
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <Button variant="ghost" style={{ fontSize: 9, padding: '3px 8px', height: 'auto', background: '#0f172a', color: '#fff' }} onClick={() => printEInvoice(inv)}>🖨</Button>
              {canEdit && <Button variant="ghost" style={{ fontSize: 9, padding: '3px 8px', height: 'auto' }} onClick={() => openEdit(inv)}>Edit</Button>}
              {isAdmin && inv.status === 'IRN Obtained' && !inv.bill_id &&
                <Button style={{ fontSize: 9, padding: '3px 8px', height: 'auto' }} onClick={() => onPushToBills(inv)}>→ Bills</Button>
              }
            </div>
          )},
        ]}
      />

      {/* ── Form Modal ──────────────────────────────────────────────── */}
      {modal === 'form' && (
        <Modal title={(form.id ? 'Edit' : 'New') + ' Invoice — ' + (form.inv_no || 'Auto')} wide onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Firm selector */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#f97316', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>ISSUING COMPANY</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {FIRMS.map(fi => (
                  <button key={fi.key} onClick={() => {
                    const nn = form.id ? form.inv_no : nextEINo(fi.key, einvoices);
                    setForm(p => ({ ...p, firm: fi.key, inv_no: nn }));
                  }} style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '2px solid ' + (form.firm === fi.key ? '#f97316' : '#e2e8f0'),
                    background: form.firm === fi.key ? '#fff7ed' : '#f8fafc',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    color: form.firm === fi.key ? '#ea580c' : '#64748b'
                  }}>
                    🏢 {fi.key === 'opc' ? 'OPC' : 'Prop'} ({fi.gst})
                  </button>
                ))}
              </div>
            </div>

            {/* Client / Site / WO / Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>BILL TO (CLIENT) *</div>
                <select value={form.client_name || ''} onChange={e => sf('client_name', e.target.value)} style={inp({ width: '100%' })}>
                  <option value="">Select...</option>
                  {EI_CLIENTS.map(c => <option key={c.name} value={c.name}>{c.name}{c.gstin ? ' (✓)' : ''}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SITE</div>
                <select value={form.site || ''} onChange={e => sf('site', e.target.value)} style={inp({ width: '100%' })}>
                  <option value="">Select...</option>
                  {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>WORK ORDER NO.</div>
                <input list="ei-wo-list" value={form.wo_no || ''} onChange={e => sf('wo_no', e.target.value)} placeholder="WO number" style={inp({ width: '100%' })} />
                <datalist id="ei-wo-list">{workOrders.map(w => <option key={w.id} value={w.wo_no} />)}</datalist>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>INVOICE DATE *</div>
                <input type="date" value={form.invoice_date || ''} onChange={e => sf('invoice_date', e.target.value)} style={inp({ width: '100%' })} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a', letterSpacing: 1.5, textTransform: 'uppercase' }}>LINE ITEMS</div>
                {canEdit && <Button onClick={addItem} style={{ fontSize: 10, padding: '4px 12px' }}>＋ Add Row</Button>}
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Description of Service', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)', ''].map((h, i) => (
                        <th key={i} style={{ padding: '7px 8px', textAlign: i >= 5 && i <= 6 ? 'right' : 'left', fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(form.line_items || []).map((item: any, idx: number) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: 10, width: 24 }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px' }}>
                          <input value={item.desc || ''} onChange={e => updateItem(idx, 'desc', e.target.value)} placeholder="e.g. Mechanical Erection" style={inp({ width: '100%', minWidth: 180 })} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 90 }}>
                          <select value={item.hsn || EI_DEFAULT_HSN} onChange={e => updateItem(idx, 'hsn', e.target.value)} style={inp({ width: '100%', fontSize: 10 })}>
                            {EI_HSN_CODES.map(h => <option key={h.code} value={h.code}>{h.code}{h.code === EI_DEFAULT_HSN ? ' ★' : ''}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px', width: 60 }}>
                          <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} style={inp({ width: '100%', textAlign: 'right' })} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 70 }}>
                          <input list="ei-units-dl" value={item.unit || ''} onChange={e => updateItem(idx, 'unit', e.target.value)} style={inp({ width: '100%', fontSize: 10 })} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 110 }}>
                          <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} placeholder="0.00" style={inp({ width: '100%', textAlign: 'right' })} />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace', width: 110 }}>
                          ₹{parseFloat(String(item.amount || calcItemAmt(item) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '4px 6px', width: 28, textAlign: 'center' }}>
                          {(form.line_items || []).length > 1 && <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, padding: '2px' }}>×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={6} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Total Taxable Value</td>
                      <td colSpan={2} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                        ₹{parseFloat(form.taxable_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <datalist id="ei-units-dl">{EI_UNITS.map(u => <option key={u} value={u} />)}</datalist>
            </div>

            {/* GST / TDS / Total */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>GST %</div>
                <select value={form.gst_percent} onChange={e => sf('gst_percent', e.target.value)} style={inp({ width: '100%' })}>
                  {['5', '12', '18', '28'].map(g => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#0369a1', letterSpacing: 1, marginBottom: 4 }}>GST AMOUNT (AUTO)</div>
                <input readOnly value={'₹ ' + parseFloat(form.gst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  style={inp({ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700 })} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', letterSpacing: 1, marginBottom: 4 }}>TDS DEDUCTION (₹)</div>
                <input type="number" value={form.tds_amount || ''} onChange={e => sf('tds_amount', e.target.value)} placeholder="0.00"
                  style={inp({ width: '100%', border: '1px solid #fecaca' })} />
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#15803d' }}>TOTAL</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#15803d', fontFamily: 'IBM Plex Mono, monospace' }}>
                  ₹{parseFloat(form.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* IRN / E-Way / Status / Remarks */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>IRN & COMPLIANCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>IRN (FROM GST PORTAL)</div>
                  <input value={form.irn || ''} onChange={e => sf('irn', e.target.value)} placeholder="64-char IRN hash" style={inp({ width: '100%', fontSize: 10 })} />
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>E-WAY BILL NO.</div>
                  <input value={form.eway_bill || ''} onChange={e => sf('eway_bill', e.target.value)} placeholder="12-digit EWB" style={inp({ width: '100%' })} />
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>STATUS</div>
                  <select value={form.status} onChange={e => sf('status', e.target.value)} style={inp({ width: '100%' })}>
                    {EI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>REMARKS</div>
                  <input value={form.remarks || ''} onChange={e => sf('remarks', e.target.value)} placeholder="Optional" style={inp({ width: '100%' })} />
                </div>
              </div>
              <div style={{ marginTop: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', fontSize: 10, color: '#1d4ed8' }}>
                ℹ Default HSN is 998719 (Maintenance & repair services). IRN entry is manual — GST Portal API planned.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button onClick={saveInvoice} loading={saving} style={{ flex: 1, padding: '10px 0' }}>
              {saving ? 'Saving...' : form.id ? '✔ Update Invoice' : '✔ Create Invoice'}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0' }}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
