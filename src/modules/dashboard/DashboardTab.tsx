import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/config/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { fmtINR, fmtNum } from '@/utils/formatters';
import type { Bill, Payable } from '@/types/bill.types';
import { colors, fonts } from '@/styles/tokens';

interface Props {
  assignedSites?: string[];
  isDirector: boolean;
  isAdmin: boolean;
  uName: string;
  userRole: string;
  getPerm: (p: string) => boolean;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

interface SiteRow {
  site: string;
  billed: number;
  receivable: number;
  payable: number;
  net: number;
  stockUnits: number;
  items: number;
}

const getBal = (b: Bill) => {
  const base = Number(b.amount_with_gst || b.amount || 0);
  const permDed = ['tds', 'tds_on_gst', 'credit_note', 'credit_note2'].reduce((s, k) => s + Number((b as any)[k] || 0), 0);
  const credited = Number(b.amount_credited || 0);
  const holdsReturned = ['sd_received', 'hra_received', 'gst_received', 'others_received', 'fines_received', 'dlp_received', 'retention_received'].reduce((s, k) => s + Number((b as any)[k] || 0), 0);
  if (b.bill_status === 'RECEIVED' || b.bill_status === 'CANCELLED') return 0;
  return Math.max(0, base - permDed - credited - holdsReturned);
};

const fmtCrL = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return fmtINR(v);
};

/* ---- OD Account constants (hard-coded as in old site) ---- */
const OD_BANK = 'South Indian Bank';
const OD_LIMIT = 27500000; // ₹2.75Cr
const OD_UTILISED = 25900000; // ₹2.59Cr
const OD_AVAILABLE = OD_LIMIT - OD_UTILISED;
const OD_PCT = Math.round((OD_UTILISED / OD_LIMIT) * 100);

/* ---- Bank Balance constant (as shown in old site) ---- */
const BANK_BALANCE = 8753000; // ₹87.53L
const BANK_UPDATED = '06 Mar, 06:08 pm';

export const DashboardTab: React.FC<Props> = ({ assignedSites }) => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billsView, setBillsView] = useState<'overview' | 'pending'>('overview');
  const [drillSite, setDrillSite] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      db.from('bills').select('*'),
      db.from('payables').select('*'),
      db.from('store_items').select('id, site, qty, unit, min_qty'),
      db.from('inventory').select('id, site, qty, min_qty, condition'),
    ]).then(([b, p, si, inv]) => {
      let billData = b.data ?? [];
      let payData = p.data ?? [];
      let storeData = si.data ?? [];
      let invData = inv.data ?? [];
      if (assignedSites?.length) {
        billData = billData.filter(x => assignedSites.includes(x.site));
        payData = payData.filter(x => assignedSites.includes(x.site));
        storeData = storeData.filter(x => assignedSites.includes(x.site));
        invData = invData.filter(x => assignedSites.includes(x.site));
      }
      setBills(billData);
      setPayables(payData);
      setStoreItems(storeData);
      setInventoryItems(invData);
      setLoading(false);
    });
  }, [assignedSites?.join(',')]);

  // All hooks MUST be above early returns
  const siteData: SiteRow[] = useMemo(() => {
    const validBills = bills.filter(b => b.bill_status !== 'CANCELLED');
    const allSites = new Set([
      ...bills.map(b => b.site),
      ...payables.map(p => p.site),
      ...storeItems.map(s => s.site),
      ...inventoryItems.map(i => i.site),
    ]);
    return [...allSites].filter(Boolean).map(site => {
      const sb = validBills.filter(b => b.site === site);
      const sp = payables.filter(p => p.site === site && p.status !== 'Paid');
      const billed = sb.reduce((s, b) => s + Number(b.amount_with_gst || 0), 0);
      const receivable = sb.reduce((s, b) => s + getBal(b), 0);
      const payable = sp.reduce((s, p) => s + Number(p.amount || 0), 0);
      const stockUnits = storeItems.filter(s => s.site === site).reduce((s, i) => s + Number(i.qty || 0), 0);
      const items = inventoryItems.filter(i => i.site === site).length;
      return { site, billed, receivable, payable, net: receivable - payable, stockUnits, items };
    }).sort((a, b) => b.billed - a.billed);
  }, [bills, payables, storeItems, inventoryItems]);

  const siteColumns: Column<SiteRow>[] = useMemo(() => [
    { header: 'Site', render: (s) => <span style={{ fontWeight: 700, color: colors.textPrimary }}>{s.site}</span> },
    { header: 'Total Billed', align: 'right' as const, render: (s) => <span style={{ fontFamily: fonts.mono, color: colors.info }}>{fmtCrL(s.billed)}</span> },
    { header: 'Receivable', align: 'right' as const, render: (s) => <span style={{ fontFamily: fonts.mono, color: colors.danger }}>{fmtCrL(s.receivable)}</span> },
    { header: 'Payable', align: 'right' as const, render: (s) => <span style={{ fontFamily: fonts.mono, color: colors.warning }}>{s.payable > 0 ? fmtCrL(s.payable) : '—'}</span> },
    { header: 'Net', align: 'right' as const, render: (s) => <span style={{ fontFamily: fonts.mono, fontWeight: 700, color: s.net > 0 ? colors.success : s.net < 0 ? colors.danger : colors.textMuted }}>{s.net !== 0 ? (s.net > 0 ? '+' : '') + fmtCrL(s.net) : '+₹0'}</span> },
    { header: 'Stock Units', align: 'right' as const, render: (s) => <span style={{ fontFamily: fonts.mono, color: colors.textSecondary, fontWeight: 700 }}>{fmtNum(s.stockUnits)}</span> },
    { header: 'Items', align: 'right' as const, render: (s) => s.items > 0 ? <span style={{ color: colors.brand, cursor: 'pointer', textDecoration: 'underline', fontFamily: fonts.mono }} onClick={() => navigate(`/inventory?site=${encodeURIComponent(s.site)}`)}>{s.items} items</span> : <span style={{ color: colors.textMuted }}>0 items</span> },
  ], [navigate]);

  const validBills = useMemo(() => bills.filter(b => b.bill_status !== 'CANCELLED'), [bills]);

  // Bills site summary for SITE OVERVIEW tab
  const billsSiteSummary = useMemo(() => {
    const sites = [...new Set(validBills.map(b => b.site))].filter(Boolean);
    return sites.map(site => {
      const sb = validBills.filter(b => b.site === site);
      const billed = sb.reduce((s, b) => s + Number(b.amount_with_gst || 0), 0);
      const received = billed - sb.reduce((s, b) => s + getBal(b), 0);
      const pending = sb.reduce((s, b) => s + getBal(b), 0);
      const holdsPending = sb.reduce((s, b) => {
        return s + Math.max(0, Number((b as any).security_deposit || 0) - Number((b as any).sd_received || 0))
          + Math.max(0, Number((b as any).hra_deduction || 0) - Number((b as any).hra_received || 0))
          + Math.max(0, Number((b as any).gst_hold || 0) - Number((b as any).gst_received || 0));
      }, 0);
      const oldestPending = sb.filter(b => getBal(b) > 0).sort((a, b) => new Date(a.invoice_date || a.created_at || '').getTime() - new Date(b.invoice_date || b.created_at || '').getTime())[0];
      const days = oldestPending ? Math.floor((Date.now() - new Date(oldestPending.invoice_date || oldestPending.created_at || '').getTime()) / 86400000) : 0;
      const status = pending === 0 ? { label: 'CLEAR', color: '#16a34a' } : days > 60 ? { label: 'OVERDUE', color: '#dc2626' } : days > 30 ? { label: 'DUE', color: '#ca8a04' } : { label: 'ACTIVE', color: '#2563eb' };
      return { site, count: sb.length, billed, received, pending, holdsPending, days, status };
    }).sort((a, b) => b.billed - a.billed);
  }, [validBills]);

  // Stock overview
  const stockOverview = useMemo(() => {
    const sites = [...new Set(inventoryItems.map(i => i.site))].filter(Boolean);
    return sites.map(site => {
      const si = inventoryItems.filter(i => i.site === site);
      return {
        site,
        total: si.length,
        units: si.reduce((s: number, i: any) => s + Number(i.qty || 0), 0),
        lowStock: si.filter((i: any) => Number(i.qty || 0) <= Number(i.min_qty || 1)).length,
        needsAttention: si.filter((i: any) => i.condition === 'Poor' || i.condition === 'Under Repair' || i.condition === 'Breakdown').length,
      };
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [inventoryItems]);

  if (loading) return <Spinner />;

  const totalReceivable = validBills.reduce((s, b) => s + getBal(b), 0);
  const totalPayable = payables.filter(p => p.status !== 'Paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBilled = validBills.reduce((s, b) => s + Number(b.amount_with_gst || 0), 0);
  const totalReceived = totalBilled - totalReceivable;
  const netCash = totalReceivable - totalPayable;
  const totalStock = storeItems.reduce((s, i) => s + Number(i.qty || 0), 0);
  const totalInvItems = inventoryItems.length;
  const pendingBills = validBills.filter(b => getBal(b) > 0);

  const mono = fonts.mono;
  const tabBtn = (key: string, label: string) => (
    <button key={key} onClick={() => { setBillsView(key as any); setDrillSite(null); }} style={{ background: billsView === key ? '#f97316' : 'none', color: billsView === key ? '#fff' : '#94a3b8', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, letterSpacing: 1, padding: '5px 12px', borderRadius: 5, fontWeight: 700 }}>{label}</button>
  );

  return (
    <div>
      {/* Section Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>SITE-WISE FINANCIAL & STOCK OVERVIEW</span>
      </div>

      {/* Financial Summary Cards - 4 in one row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'TOTAL RECEIVABLE', val: fmtCrL(totalReceivable), color: colors.danger },
          { label: 'TOTAL PAYABLE', val: fmtCrL(totalPayable), color: '#16a34a', sub: `Incl. OD: ${fmtCrL(totalPayable + OD_UTILISED)}` },
          { label: 'BANK BALANCE', val: fmtCrL(BANK_BALANCE), color: '#1e40af', sub: `Updated: ${BANK_UPDATED}` },
          { label: 'NET CASH POSITION', val: fmtCrL(netCash), color: netCash > 0 ? '#16a34a' : colors.danger, sub: netCash > 0 ? 'surplus' : 'deficit' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 8, fontFamily: mono, fontWeight: 700, color: colors.textMuted, letterSpacing: 1, marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: mono, color: c.color, lineHeight: 1 }}>{c.val}</div>
            {c.sub && <div style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* OD Account - compact inline bar */}
      <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 110 }}>
          <span style={{ fontSize: 12 }}>🏦</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: colors.textPrimary }}>{OD_BANK}</div>
            <div style={{ fontSize: 8, color: colors.textMuted }}>OD Account</div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 3, height: 5, overflow: 'hidden' }}>
          <div style={{ background: '#dc2626', width: `${OD_PCT}%`, height: '100%', borderRadius: 3 }} />
        </div>
        <span style={{ background: '#fef2f2', borderRadius: 10, padding: '1px 7px', fontSize: 9, fontWeight: 700, color: colors.danger }}>{OD_PCT}%</span>
        {[{ l: 'LIMIT', v: fmtCrL(OD_LIMIT), c: '#0284c7' }, { l: 'UTILISED', v: fmtCrL(OD_UTILISED), c: '#dc2626' }, { l: 'AVAILABLE', v: fmtCrL(OD_AVAILABLE), c: '#16a34a' }].map(d => (
          <div key={d.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 7, fontFamily: mono, fontWeight: 700, color: d.c, letterSpacing: 1 }}>{d.l}</div>
            <div style={{ fontSize: 11, fontWeight: 800, fontFamily: mono, color: d.c }}>{d.v}</div>
          </div>
        ))}
      </div>

      {/* Site-wise table */}
      {siteData.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <DataTable<SiteRow> columns={siteColumns} data={siteData} emptyMessage="No site data" initialPageSize={25} pageSizeOptions={[10, 25, 50]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr', background: colors.slate50, border: `1px solid ${colors.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '7px 14px', fontSize: 10, fontWeight: 800 }}>
            <span style={{ fontFamily: mono, color: colors.textSecondary }}>TOTAL</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: colors.info }}>{fmtCrL(totalBilled)}</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: colors.danger }}>{fmtCrL(totalReceivable)}</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: colors.warning }}>{fmtCrL(totalPayable)}</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: netCash > 0 ? colors.success : colors.danger }}>+{fmtCrL(netCash)}</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: colors.textSecondary }}>{fmtNum(totalStock)}</span>
            <span style={{ textAlign: 'right', fontFamily: mono, color: colors.textSecondary }}>{fmtNum(totalInvItems)} items</span>
          </div>
        </div>
      )}

      {/* 💰 BILLS SUMMARY with sub-tabs */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: '#f97316', letterSpacing: 2, marginBottom: 12 }}>💰 BILLS SUMMARY</div>

        {/* 3 clickable summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'TOTAL BILLED', val: fmtCrL(totalBilled), sub: `${bills.length} invoices`, color: '#2563eb', pct: 100 },
            { label: 'TOTAL RECEIVED', val: fmtCrL(totalReceived), sub: `${totalBilled > 0 ? Math.round(totalReceived / totalBilled * 100) : 0}% collected`, color: '#16a34a', pct: totalBilled > 0 ? Math.round(totalReceived / totalBilled * 100) : 0 },
            { label: 'TOTAL PENDING', val: fmtCrL(totalReceivable), sub: `${pendingBills.length} bills outstanding`, color: '#f97316', pct: totalBilled > 0 ? Math.round(totalReceivable / totalBilled * 100) : 0 },
          ].map(c => (
            <div key={c.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 8, fontFamily: mono, color: '#94a3b8', letterSpacing: 1.5, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color, fontFamily: mono, marginBottom: 3 }}>{c.val}</div>
              <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 5 }}>{c.sub}</div>
              <div style={{ height: 3, background: '#e2e8f0', borderRadius: 99 }}>
                <div style={{ height: 3, borderRadius: 99, background: c.color, width: `${c.pct}%`, opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sub-tabs: SITE OVERVIEW / PENDING BILLS */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 10, background: '#f1f5f9', borderRadius: 6, padding: 2, width: 'fit-content' }}>
          {tabBtn('overview', 'SITE OVERVIEW')}
          {tabBtn('pending', 'PENDING BILLS')}
        </div>

        {/* SITE OVERVIEW table */}
        {billsView === 'overview' && !drillSite && (
          <DataTable columns={[
            { header: 'Site', render: (s: any) => <div><div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', cursor: 'pointer' }} onClick={() => setDrillSite(s.site)}>{s.site}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>{s.count} invoices</div></div> },
            { header: 'Total Billed', align: 'right' as const, render: (s: any) => <span style={{ fontWeight: 700, fontSize: 11, color: '#2563eb', fontFamily: mono }}>{fmtCrL(s.billed)}</span> },
            { header: 'Received', align: 'right' as const, render: (s: any) => <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 11, fontFamily: mono }}>{fmtCrL(s.received)}</span> },
            { header: 'Pending', align: 'right' as const, render: (s: any) => <span style={{ color: s.pending > 0 ? '#f97316' : '#16a34a', fontWeight: 700, fontSize: 11, fontFamily: mono }}>{fmtCrL(s.pending)}</span> },
            { header: 'Holds', align: 'right' as const, render: (s: any) => s.holdsPending > 0 ? <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 11, fontFamily: mono }}>{fmtCrL(s.holdsPending)}</span> : <span style={{ color: '#94a3b8' }}>—</span> },
            { header: 'Oldest', render: (s: any) => s.days > 0 ? <span style={{ fontSize: 10, color: s.days > 60 ? '#dc2626' : s.days > 30 ? '#ca8a04' : '#64748b', fontWeight: s.days > 30 ? 700 : 400 }}>{s.days} days</span> : <span style={{ color: '#16a34a', fontSize: 10 }}>—</span> },
            { header: 'Status', render: (s: any) => <span style={{ fontSize: 9, fontWeight: 700, color: s.status.color, background: s.status.color + '12', border: `1px solid ${s.status.color}30`, padding: '2px 7px', borderRadius: 4 }}>{s.status.label}</span> },
          ]} data={billsSiteSummary} emptyMessage="No bills" initialPageSize={15} pageSizeOptions={[10, 15, 25]} />
        )}

        {/* Drill-down: site bills */}
        {billsView === 'overview' && drillSite && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button onClick={() => setDrillSite(null)} style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 9 }}>← BACK</button>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{drillSite} - All Bills</span>
            </div>
            <DataTable columns={[
              { header: 'Inv No', render: (b: Bill) => <span style={{ color: '#f97316', fontWeight: 700, fontSize: 11 }}>{(b as any).inv_no || '—'}</span> },
              { header: 'Details', render: (b: Bill) => <span style={{ fontSize: 11, color: '#475569' }}>{(b as any).bill_details || '—'}</span> },
              { header: 'Billed', align: 'right' as const, render: (b: Bill) => <span style={{ fontFamily: mono, fontWeight: 700, color: '#2563eb', fontSize: 11 }}>{fmtCrL(Number(b.amount_with_gst || 0))}</span> },
              { header: 'Pending', align: 'right' as const, render: (b: Bill) => <span style={{ fontFamily: mono, fontWeight: 700, color: getBal(b) > 0 ? '#f97316' : '#16a34a', fontSize: 11 }}>{fmtCrL(getBal(b))}</span> },
              { header: 'Status', render: (b: Bill) => <span style={{ fontSize: 9, fontWeight: 700, color: getBal(b) === 0 ? '#16a34a' : '#f97316', background: (getBal(b) === 0 ? '#16a34a' : '#f97316') + '12', padding: '2px 6px', borderRadius: 3 }}>{getBal(b) === 0 ? 'RECEIVED' : 'PENDING'}</span> },
            ]} data={validBills.filter(b => b.site === drillSite)} emptyMessage="No bills for this site" initialPageSize={15} pageSizeOptions={[10, 15, 25]} />
          </div>
        )}

        {/* PENDING BILLS table */}
        {billsView === 'pending' && (
          <DataTable columns={[
            { header: 'Invoice', render: (b: Bill) => <div><div style={{ fontWeight: 700, fontSize: 11, color: '#f97316' }}>{(b as any).inv_no}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>{b.site}</div></div> },
            { header: 'Details', render: (b: Bill) => <span style={{ fontSize: 11, color: '#475569' }}>{(b as any).bill_details || '—'}</span> },
            { header: 'Billed', align: 'right' as const, render: (b: Bill) => <span style={{ fontFamily: mono, fontWeight: 700, color: '#2563eb', fontSize: 11 }}>{fmtCrL(Number(b.amount_with_gst || 0))}</span> },
            { header: 'Pending', align: 'right' as const, render: (b: Bill) => <span style={{ fontFamily: mono, fontWeight: 700, color: '#f97316', fontSize: 11 }}>{fmtCrL(getBal(b))}</span> },
          ]} data={pendingBills} emptyMessage="No pending bills" initialPageSize={15} pageSizeOptions={[10, 15, 25, 50]} />
        )}
      </div>

      {/* 📦 SITE-WISE STOCK OVERVIEW */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: '#0f172a', letterSpacing: 2, marginBottom: 10 }}>📦 SITE-WISE STOCK OVERVIEW</div>
        <DataTable columns={[
          { header: 'Site', render: (s: any) => <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{s.site}</span> },
          { header: 'Total Items', render: (s: any) => <span style={{ fontFamily: mono, fontWeight: 700, color: '#2563eb' }}>{s.total} items</span> },
          { header: 'Total Units', render: (s: any) => <span style={{ fontFamily: mono, fontWeight: 700, color: '#0f172a' }}>{fmtNum(s.units)} units</span> },
          { header: 'Low Stock', render: (s: any) => s.lowStock > 0 ? <span style={{ color: '#ea580c', fontWeight: 700, fontFamily: mono }}>{s.lowStock} items</span> : <span style={{ color: '#16a34a', fontSize: 11 }}>—</span> },
          { header: 'Needs Attention', render: (s: any) => s.needsAttention > 0 ? <span style={{ color: '#dc2626', fontWeight: 700, fontFamily: mono }}>{s.needsAttention} items</span> : <span style={{ color: '#16a34a', fontSize: 11 }}>—</span> },
        ]} data={stockOverview} emptyMessage="No stock data" initialPageSize={15} pageSizeOptions={[10, 15, 25]} />
      </div>
    </div>
  );
};

