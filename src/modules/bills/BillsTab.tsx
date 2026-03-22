import React, { useEffect, useState, useMemo } from 'react';
import { useBills } from '@/hooks/useBills';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { fmtINR, fmtDate } from '@/utils/formatters';
import { DEFAULT_SITE_DETAILS } from '@/config/constants';
import { getBal, getPaymentStatus, diffBill, logBillAudit } from '@/utils/billHelpers';
import type { Bill, EInvoice } from '@/types/bill.types';
import type { UserRole } from '@/types/user.types';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useEInvoices } from '@/hooks/useEInvoices';
import { useCDNotes } from '@/hooks/useCDNotes';
import { WorkOrdersTab } from './components/WorkOrdersTab';
import { EInvoiceTab } from './components/EInvoiceTab';
import { CDNotesTab } from './components/CDNotesTab';
import { SiteSearchFilter } from './components/SiteSearchFilter';
import { BillAuditLog } from './components/BillAuditLog';

interface Props {
  isAdmin: boolean;
  uName: string;
  userRole: UserRole;
  assignedSites?: string[];
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

type SubTab = 'bills' | 'e-invoice' | 'cdn' | 'work-orders' | 'audit';

const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);
const blank: Omit<Bill, 'id' | 'created_at'> = {
  site: 'MRPL', inv_no: '', invoice_date: new Date().toISOString().slice(0, 10),
  bill_details: '', amount: 0, amount_with_gst: 0,
  tds: 0, tds_on_gst: 0, security_deposit: 0, hra_deduction: 0, gst_hold: 0, other_deductions: 0,
  credit_note: 0, credit_note2: 0, hra_received: 0, sd_received: 0, gst_received: 0, others_received: 0, amount_credited: 0,
  fines_penalty: 0, fines_received: 0, fines_txn_no: '',
  dlp_hold: 0, dlp_received: 0, dlp_txn_no: '',
  retention_hold: 0, retention_received: 0, retention_txn_no: '',
  balance_to_receive: 0,
  wo_no: '', bill_status: 'Pending', remarks: '',
};

export const BillsTab: React.FC<Props> = ({ isAdmin, uName, userRole, assignedSites, showToast }) => {
  const [subTab, setSubTab] = useState<SubTab>('bills');
  const { bills, loading: billsLoading, fetch: fetchBills, save: saveBill, remove: removeBill } = useBills(assignedSites);
  const { workOrders, loading: woLoading, fetchWorkOrders, saveWorkOrder, deleteWorkOrder } = useWorkOrders();
  const { einvoices, loading: eiLoading, fetchEInvoices, saveEInvoice, deleteEInvoice } = useEInvoices();
  const { cdNotes, loading: cdnLoading, fetchCDNotes, saveCDNote, deleteCDNote } = useCDNotes();

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'view'; bill?: Bill } | null>(null);
  const [cardModal, setCardModal] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Bill, 'id' | 'created_at'>>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    fetchBills();
    fetchWorkOrders();
    fetchEInvoices();
    fetchCDNotes();
  }, [fetchBills, fetchWorkOrders, fetchEInvoices, fetchCDNotes]);

  // Dynamic year list from actual bill data
  const billYears = useMemo(() => {
    const yrs: Record<string, boolean> = {};
    bills.forEach(b => {
      if (b.invoice_date) {
        const yr = new Date(b.invoice_date).getFullYear();
        if (!isNaN(yr)) yrs[String(yr)] = true;
      }
    });
    return Object.keys(yrs).sort((a, b) => Number(b) - Number(a));
  }, [bills]);

  // Dynamic site list from actual bill data
  const billSites = useMemo(() => {
    const sites = new Set<string>();
    bills.forEach(b => { if (b.site) sites.add(b.site); });
    return Array.from(sites).sort();
  }, [bills]);

  const filtered = bills.filter(b => {
    const s = !search || b.inv_no.toLowerCase().includes(search.toLowerCase()) || b.bill_details.toLowerCase().includes(search.toLowerCase());
    const si = siteFilter === 'All' || b.site === siteFilter;
    const st = statusFilter === 'All' || b.bill_status === statusFilter;
    const yr = yearFilter === 'All' || (b.invoice_date && String(new Date(b.invoice_date).getFullYear()) === yearFilter);
    return s && si && st && yr;
  });

  const sf = (k: keyof typeof form, v: string | number) => {
    setForm(p => ({ ...p, [k]: v }));
  };

  const handleSave = async () => {
    if (!form.inv_no.trim()) return showToast('Bill number required', 'err');
    setSaving(true);
    const oldBill = modal?.bill;
    const err = await saveBill({ ...form, updated_by: uName }, modal?.bill?.id);
    setSaving(false);
    if (err) return showToast(err, 'err');
    // Audit log
    if (modal?.type === 'edit' && oldBill) {
      const changes = diffBill(oldBill, form);
      if (Object.keys(changes).length > 0) {
        logBillAudit(oldBill.id, oldBill.inv_no, 'EDITED', changes, uName, userRole);
      }
    } else if (modal?.type === 'add') {
      logBillAudit('', form.inv_no, 'CREATED', {}, uName, userRole);
    }
    showToast(`Bill ${modal?.type === 'edit' ? 'updated' : 'added'}`);
    setModal(null);
  };

  const handlePushToBills = async (ei: EInvoice) => {
    const invNo = ei.inv_no || ei.invoice_no;
    if (ei.bill_id) { showToast('Already pushed to Bills', 'err'); return; }
    if (!window.confirm(`Push ${invNo} to Bills Register?\nThis creates a new receivable entry.`)) return;
    let items: any[] = [];
    try { items = typeof ei.line_items === 'string' ? JSON.parse(ei.line_items) : (ei.line_items || ei.items || []); } catch { /* empty */ }
    const desc = items.length ? items.map((it: any) => it.desc || it.description).join('; ') : 'E-Invoice: ' + invNo;
    const billPayload: Omit<Bill, 'id' | 'created_at'> = {
      ...blank,
      inv_no: invNo,
      wo_no: ei.wo_no || '',
      site: ei.site || 'MRPL',
      bill_details: desc,
      amount: Number(ei.taxable_value || ei.sub_total || 0),
      amount_with_gst: Number(ei.total_amount || ei.grand_total || 0),
      balance_to_receive: Number(ei.total_amount || ei.grand_total || 0),
      invoice_date: ei.invoice_date || new Date().toISOString().slice(0, 10),
      bill_status: 'Pending',
      gst_status: 'PAID',
      tds: Number(ei.tds_amount || 0),
    };
    const err = await saveBill(billPayload);
    if (err) { showToast(err, 'err'); return; }
    try {
      await saveEInvoice({ status: 'Pushed to Bills' } as any, ei.id);
    } catch { /* best effort */ }
    showToast('✔ Pushed to Bills Register');
  };

  const statusColor: Record<string, { bg: string; c: string }> = {
    Pending: { bg: '#fffbeb', c: '#d97706' },
    Partial: { bg: '#eff6ff', c: '#1d4ed8' },
    Paid:    { bg: '#f0fdf4', c: '#16a34a' },
    RECEIVED: { bg: '#f0fdf4', c: '#16a34a' },
    'Partially Received': { bg: '#eff6ff', c: '#1d4ed8' },
    CANCELLED: { bg: '#fef2f2', c: '#dc2626' }
  };

  const nonCancelled = filtered.filter(b => b.bill_status !== 'CANCELLED');
  const totalAmt = nonCancelled.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalGst = nonCancelled.reduce((s, b) => s + Number(b.amount_with_gst || 0), 0);
  const totalBal = nonCancelled.reduce((s, b) => s + getBal(b), 0);
  const totalBalExGst = nonCancelled.reduce((s, b) => s + Math.max(0, getBal(b) - (Number(b.amount_with_gst || 0) - Number(b.amount || 0))), 0);
  const totalSD = filtered.reduce((s, b) => s + Math.max(0, Number(b.security_deposit || 0) - Number(b.sd_received || 0)), 0);
  const totalHRA = filtered.reduce((s, b) => s + Math.max(0, Number(b.hra_deduction || 0) - Number(b.hra_received || 0)), 0);
  const totalGSTH = filtered.reduce((s, b) => s + Math.max(0, Number(b.gst_hold || 0) - Number(b.gst_received || 0)), 0);
  // Use getBal() === 0 for received count instead of bill_status
  const receivedCount = filtered.filter(b => getBal(b) === 0 && b.bill_status !== 'CANCELLED').length;
  const pendingCount = filtered.filter(b => getBal(b) > 0 && b.bill_status !== 'CANCELLED').length;

  const handleDelete = async (bill: Bill) => {
    if (!confirm('Delete bill?')) return;
    const err = await removeBill(bill.id);
    if (err) { showToast(err, 'err'); return; }
    logBillAudit(bill.id, bill.inv_no, 'DELETED', {}, uName, userRole);
    showToast('Bill deleted');
  };

  const handlePrintPDF = (type: string, rows: Bill[]) => {
    const title = type === 'billed' ? 'Total Billed' : type === 'gst' ? 'Billed (Incl GST)' : type === 'pending' ? 'Balance Pending' : type === 'sd' ? 'SD Hold' : type === 'hra' ? 'HRA Hold' : type === 'gsthold' ? 'GST Hold' : 'Bills';
    const fmt = (n: number) => n > 0 ? '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-';
    
    const tableRows = rows.map((b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${b.inv_no || '-'}</td>
        <td>${b.wo_no || '-'}</td>
        <td>${b.site || '-'}</td>
        <td>${b.invoice_date || '-'}</td>
        <td style="text-align:right">${fmt(Number(b.amount || 0))}</td>
        <td style="text-align:right">${fmt(Number(b.amount_with_gst || 0))}</td>
        <td style="text-align:right">${fmt(getBal(b))}</td>
        <td>${b.bill_status || '-'}</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 28px; color: #1e293b; }
            .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 3px solid #f97316; }
            .co { font-size: 16px; font-weight: 800; color: #f97316; }
            .sub { font-size: 11px; color: #666; margin-top: 3px; }
            .ttl { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding: 10px 14px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { background: #f97316; color: #fff; padding: 9px 11px; text-align: left; font-size: 11px; font-weight: 700; }
            td { padding: 8px 11px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) td { background: #fafafa; }
            .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            button { margin-top: 16px; padding: 9px 22px; background: #f97316; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 700; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="hdr">
            <div>
              <div class="co">P. Sunny Engineering Contractors (OPC) Pvt. Ltd.</div>
              <div class="sub">Mangaluru, Karnataka 575030 &nbsp;|&nbsp; GSTIN: 29AAOCP5225B1ZE</div>
            </div>
            <div style="text-align:right; font-size:11px; color:#64748b">
              Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div class="ttl">${title} &mdash; ${rows.length} bills</div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Inv No</th><th>WO No</th><th>Site</th><th>Date</th>
                <th style="text-align:right">Amount</th><th style="text-align:right">Incl GST</th>
                <th style="text-align:right">Balance</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">Generated by SUNNY OPS &mdash; P. Sunny Engineering Contractors (OPC) Pvt. Ltd.</div>
          <button onclick="window.print()">Print / Save PDF</button>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
        {(['bills', 'e-invoice', 'cdn', 'work-orders', 'audit'] as SubTab[]).map((t) => {
          const labels: Record<SubTab, string> = { 
            'bills': '📊 Bills Register', 
            'e-invoice': '🧾 E-Invoice', 
            'cdn': '📋 CN / DN', 
            'work-orders': '📑 Work Orders',
            'audit': '🛡 Audit Log',
          };
          const isActive = subTab === t;
          return (
            <button key={t} onClick={() => setSubTab(t)} style={{ 
              padding: '8px 18px', border: 'none', 
              borderBottom: isActive ? '3px solid #f97316' : '3px solid transparent', 
              background: 'none', cursor: 'pointer', fontWeight: isActive ? 700 : 500, 
              color: isActive ? '#f97316' : '#64748b', fontSize: 13, 
              fontFamily: 'IBM Plex Sans, Arial, sans-serif', marginBottom: -2 
            }}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {subTab === 'work-orders' && (
        <WorkOrdersTab 
          workOrders={workOrders} 
          bills={bills} 
          loading={woLoading} 
          isAdmin={isAdmin} 
          showToast={showToast}
          onSave={saveWorkOrder} 
          onDelete={deleteWorkOrder} 
        />
      )}

      {subTab === 'e-invoice' && (
        <EInvoiceTab 
          einvoices={einvoices} 
          loading={eiLoading} 
          isAdmin={isAdmin} 
          uName={uName} 
          workOrders={workOrders}
          showToast={showToast}
          onSave={saveEInvoice} 
          onDelete={deleteEInvoice} 
          onPushToBills={handlePushToBills}
        />
      )}

      {subTab === 'cdn' && (
        <CDNotesTab 
          cdNotes={cdNotes} 
          einvoices={einvoices}
          bills={bills} 
          loading={cdnLoading} 
          isAdmin={isAdmin} 
          uName={uName}
          showToast={showToast} 
          onSave={saveCDNote} 
          onDelete={deleteCDNote} 
        />
      )}

      {subTab === 'audit' && <BillAuditLog />}

      {subTab === 'bills' && (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'billed', l: 'Total Billed', v: fmtINR(totalAmt), c: '#f97316' },
              { key: 'gst', l: 'Incl. GST', v: fmtINR(totalGst), c: '#3b82f6' },
              { key: 'pending', l: 'Balance Pending', v: fmtINR(totalBal), c: '#dc2626', sub: `Excl. GST: ${fmtINR(totalBalExGst)}` },
              { key: 'sd', l: 'SD Unreceived', v: fmtINR(totalSD), c: '#d97706' },
              { key: 'hra', l: 'HRA Unreceived', v: fmtINR(totalHRA), c: '#8b5cf6' },
              { key: 'gsthold', l: 'GST Hold', v: fmtINR(totalGSTH), c: '#0891b2' },
              { key: 'received', l: 'Bills Received', v: receivedCount, c: '#16a34a' },
              { key: 'billspending', l: 'Bills Pending', v: pendingCount, c: '#ea580c' },
            ].map((item) => (
              <div 
                key={item.l} 
                onClick={() => setCardModal(item.key)}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>{item.l}</div>
                  <span style={{ fontSize: 8, color: item.c, background: item.c + '15', border: '1px solid ' + item.c + '30', padding: '1px 5px', borderRadius: 3, letterSpacing: 0.5 }}>VIEW</span>
                </div>
                <div style={{ fontSize: item.v.toString().length > 10 ? 16 : 22, fontWeight: 700, color: item.c, fontFamily: 'IBM Plex Mono, monospace' }}>{item.v}</div>
                {'sub' in item && item.sub && (
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontFamily: 'IBM Plex Mono, monospace' }}>{item.sub}</div>
                )}
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search bill no / desc..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, minWidth: 180 }} />
              <SiteSearchFilter sites={billSites} value={siteFilter} onChange={setSiteFilter} />
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
                <option>All</option>
                {billYears.map(y => <option key={y}>{y}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
                {['All', 'Pending', 'Partial', 'Paid', 'RECEIVED', 'CANCELLED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" style={{ fontSize: 10, padding: '7px 12px' }} onClick={() => handlePrintPDF('Full Register', filtered)}>⬇ PDF</Button>
              {isAdmin && <Button onClick={() => { setForm({ ...blank }); setModal({ type: 'add' }); }}>+ Add Bill</Button>}
            </div>
          </div>

          {/* Table */}
          <DataTable
            loading={billsLoading}
            data={filtered}
            onRowClick={(bill) => setModal({ type: 'view', bill })}
            rowStyle={(bill) => ({ background: getBal(bill) > 0 ? '#fffbeb' : '#fff' })}
            columns={[
              { header: 'Year', render: (bill) => bill.invoice_date ? new Date(bill.invoice_date).getFullYear() : '-', width: 60 },
              { header: 'Inv No', render: (bill) => <span style={{ fontWeight: 700, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace' }}>{bill.inv_no}</span> },
              { header: 'WO Number', key: 'wo_no', width: 120 },
              { header: 'Description', key: 'bill_details', width: 150 },
              { header: 'Site', render: (bill) => <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{bill.site}</span> },
              { header: 'Inv Date', render: (bill) => fmtDate(bill.invoice_date) },
              { header: 'Amount', render: (bill) => fmtINR(bill.amount), align: 'right' },
              { header: 'Incl GST', render: (bill) => <span style={{ color: '#3b82f6' }}>{fmtINR(bill.amount_with_gst)}</span>, align: 'right' },
              { header: 'Balance', render: (bill) => {
                const bal = getBal(bill);
                return <span style={{ color: bal > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{bal > 0 ? fmtINR(bal) : '—'}</span>;
              }, align: 'right' },
              { header: 'SD Hold', render: (bill) => {
                const sdPend = Math.max(0, Number(bill.security_deposit || 0) - Number(bill.sd_received || 0));
                return <span style={{ color: sdPend > 0 ? '#d97706' : '#94a3b8' }}>{sdPend > 0 ? fmtINR(sdPend) : '-'}</span>;
              }, align: 'right' },
              { header: 'HRA Hold', render: (bill) => {
                const hraPend = Math.max(0, Number(bill.hra_deduction || 0) - Number(bill.hra_received || 0));
                return <span style={{ color: hraPend > 0 ? '#8b5cf6' : '#94a3b8' }}>{hraPend > 0 ? fmtINR(hraPend) : '-'}</span>;
              }, align: 'right' },
              { header: 'Status', render: (bill) => {
                const ps = getPaymentStatus(bill);
                const sc = statusColor[ps.status] || { bg: '#f1f5f9', c: '#475569' };
                return (
                  <div>
                    <span style={{ background: sc.bg, color: sc.c, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid #e2e8f0' }}>{ps.status}</span>
                    {ps.tags.length > 0 && (
                      <div style={{ marginTop: 3 }}>
                        {ps.tags.map(tag => (
                          <div key={tag} style={{ fontSize: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{tag}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }},
              { header: 'GST', render: (bill) => (
                <>
                  <span style={{ 
                    background: bill.gst_status === 'PAID' ? '#f0fdf4' : '#fff7ed', 
                    color: bill.gst_status === 'PAID' ? '#16a34a' : '#d97706', 
                    border: '1px solid ' + (bill.gst_status === 'PAID' ? '#bbf7d0' : '#fed7aa'),
                    borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' 
                  }}>{bill.gst_status || '?'}</span>
                  {bill.status2 && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{bill.status2}</div>}
                </>
              )},
              { header: 'Action', render: (bill) => (
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" style={{ fontSize: 9, padding: '3px 8px', height: 'auto' }} onClick={() => { setForm({ ...bill }); setModal({ type: 'edit', bill }); }}>Edit</Button>
                      <Button variant="danger" style={{ fontSize: 9, padding: '3px 8px', height: 'auto' }} onClick={() => handleDelete(bill)}>Del</Button>
                    </>
                  )}
                </div>
              )}
            ]}
          />
        </div>
      )}

      {/* Add/Edit Modal (for Bills Register) */}
      {modal && modal.type !== 'view' && (
        <Modal title={modal.type === 'edit' ? 'Edit Bill' : 'Add Bill'} wide onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {([
              ['Site', 'site', 'select', SITES],
              ['Bill No *', 'inv_no', 'text'],
              ['Date', 'invoice_date', 'date'],
              ['W.O. No', 'wo_no', 'text'],
              ['Description', 'bill_details', 'text', null, true],
              ['Billed Amount', 'amount', 'number'],
              ['Billed Amount (GST)', 'amount_with_gst', 'number'],
              ['TDS', 'tds', 'number'],
              ['TDS on GST', 'tds_on_gst', 'number'],
              ['Security Deposit', 'security_deposit', 'number'],
              ['SD Received', 'sd_received', 'number'],
              ['HRA Deduction', 'hra_deduction', 'number'],
              ['HRA Received', 'hra_received', 'number'],
              ['GST Hold', 'gst_hold', 'number'],
              ['GST Received', 'gst_received', 'number'],
              ['Other Deductions', 'other_deductions', 'number'],
              ['Others Received', 'others_received', 'number'],
              ['Credit Note', 'credit_note', 'number'],
              ['Credit Note 2', 'credit_note2', 'number'],
              ['Fines & Penalties', 'fines_penalty', 'number'],
              ['Fines Received', 'fines_received', 'number'],
              ['Fines Txn No', 'fines_txn_no', 'text'],
              ['DLP Hold', 'dlp_hold', 'number'],
              ['DLP Received', 'dlp_received', 'number'],
              ['DLP Txn No', 'dlp_txn_no', 'text'],
              ['Retention Hold', 'retention_hold', 'number'],
              ['Retention Received', 'retention_received', 'number'],
              ['Retention Txn No', 'retention_txn_no', 'text'],
              ['Amount Credited', 'amount_credited', 'number'],
              ['Status', 'bill_status', 'select', ['Pending', 'Partial', 'Paid', 'RECEIVED', 'CANCELLED']],
              ['GST Status', 'gst_status', 'select', ['', 'PAID', 'UNPAID']],
              ['Status 2', 'status2', 'text'],
              ['Remarks', 'remarks', 'text', null, true],
            ] as Array<[string, keyof typeof form, string, string[] | null | undefined, boolean?]>).map(([label, key, type, opts, span]) => (
              <div key={key} style={span ? { gridColumn: '1/-1' } : {}}>
                <label style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
                {type === 'select' && opts ? (
                  <select value={form[key] as string} onChange={e => sf(key, e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key] as string | number}
                    onChange={e => sf(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', background: '#fff' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Button onClick={handleSave} loading={saving} style={{ flex: 1, padding: '11px 0' }}>
              {modal.type === 'edit' ? '✓ Save Changes' : '+ Add Bill'}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0' }}>Cancel</Button>
          </div>
        </Modal>
      )}

      {/* Card Detail Modal */}
      {cardModal && (
        <Modal 
          wide 
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{cardModal === 'billed' ? 'Total Billed' : cardModal === 'gst' ? 'Billed (Incl GST)' : cardModal === 'pending' ? 'Balance Pending' : cardModal === 'sd' ? 'SD Hold' : cardModal === 'hra' ? 'HRA Hold' : cardModal === 'gsthold' ? 'GST Hold' : cardModal === 'received' ? 'Bills Received' : 'Bills Pending'}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {(() => {
                    const rows = filtered.filter(b => {
                      if (cardModal === 'billed' || cardModal === 'gst') return b.bill_status !== 'CANCELLED';
                      if (cardModal === 'pending') return getBal(b) > 0;
                      if (cardModal === 'sd') return Number(b.security_deposit || 0) - Number(b.sd_received || 0) > 0;
                      if (cardModal === 'hra') return Number(b.hra_deduction || 0) - Number(b.hra_received || 0) > 0;
                      if (cardModal === 'gsthold') return Number(b.gst_hold || 0) - Number(b.gst_received || 0) > 0;
                      if (cardModal === 'received') return getBal(b) === 0 && b.bill_status !== 'CANCELLED';
                      return getBal(b) > 0 && b.bill_status !== 'CANCELLED';
                    });
                    const total = cardModal === 'billed' ? rows.reduce((s, b) => s + Number(b.amount || 0), 0) : cardModal === 'gst' ? rows.reduce((s, b) => s + Number(b.amount_with_gst || 0), 0) : cardModal === 'pending' ? rows.reduce((s, b) => s + getBal(b), 0) : cardModal === 'sd' ? rows.reduce((s, b) => s + Math.max(0, Number(b.security_deposit || 0) - Number(b.sd_received || 0)), 0) : cardModal === 'hra' ? rows.reduce((s, b) => s + Math.max(0, Number(b.hra_deduction || 0) - Number(b.hra_received || 0)), 0) : cardModal === 'gsthold' ? rows.reduce((s, b) => s + Math.max(0, Number(b.gst_hold || 0) - Number(b.gst_received || 0)), 0) : null;
                    return `${rows.length} bills ${total ? ` · ${fmtINR(total)}` : ''}`;
                  })()}
                </span>
              </div>
              <Button 
                variant="ghost" 
                style={{ fontSize: 9, padding: '4px 10px', height: 'auto', marginRight: 10 }}
                onClick={() => {
                  const rows = filtered.filter(b => {
                    if (cardModal === 'billed' || cardModal === 'gst') return b.bill_status !== 'CANCELLED';
                    if (cardModal === 'pending') return getBal(b) > 0;
                    if (cardModal === 'sd') return Number(b.security_deposit || 0) - Number(b.sd_received || 0) > 0;
                    if (cardModal === 'hra') return Number(b.hra_deduction || 0) - Number(b.hra_received || 0) > 0;
                    if (cardModal === 'gsthold') return Number(b.gst_hold || 0) - Number(b.gst_received || 0) > 0;
                    if (cardModal === 'received') return getBal(b) === 0 && b.bill_status !== 'CANCELLED';
                    return getBal(b) > 0 && b.bill_status !== 'CANCELLED';
                  });
                  handlePrintPDF(cardModal, rows);
                }}
              >
                ⬇ PDF
              </Button>
            </div>
          }
          onClose={() => setCardModal(null)}
        >
          <DataTable<Bill>
            data={filtered.filter(b => {
              if (cardModal === 'billed' || cardModal === 'gst') return b.bill_status !== 'CANCELLED';
              if (cardModal === 'pending') return getBal(b) > 0;
              if (cardModal === 'sd') return Number(b.security_deposit || 0) - Number(b.sd_received || 0) > 0;
              if (cardModal === 'hra') return Number(b.hra_deduction || 0) - Number(b.hra_received || 0) > 0;
              if (cardModal === 'gsthold') return Number(b.gst_hold || 0) - Number(b.gst_received || 0) > 0;
              if (cardModal === 'received') return getBal(b) === 0 && b.bill_status !== 'CANCELLED';
              return getBal(b) > 0 && b.bill_status !== 'CANCELLED';
            })}
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyMessage="No bills match this filter."
            columns={[
              { header: 'Inv No', render: (b) => <span style={{ fontWeight: 700 }}>{b.inv_no}</span> },
              { header: 'Site', key: 'site' },
              { header: 'Description', render: (b) => <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{b.bill_details}</span> },
              { header: 'Inv Date', render: (b) => fmtDate(b.invoice_date) },
              { header: 'Amount', render: (b) => fmtINR(b.amount), align: 'right' },
              { header: 'Incl GST', render: (b) => fmtINR(b.amount_with_gst), align: 'right' },
              { header: 'Balance', render: (b) => <span style={{ color: '#dc2626', fontWeight: 700 }}>{fmtINR(getBal(b))}</span>, align: 'right' },
              { header: 'Status', render: (b) => {
                const sc = statusColor[b.bill_status] || statusColor['Pending'];
                return <span style={{ background: sc.bg, color: sc.c, padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700 }}>{b.bill_status}</span>;
              }},
            ]}
          />
        </Modal>
      )}
    </div>
  );
};
