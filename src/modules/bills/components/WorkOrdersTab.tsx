import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import type { WorkOrder, Bill } from '@/types/bill.types';
import { fmtINR, fmtDate } from '@/utils/formatters';

interface Props {
  workOrders: WorkOrder[];
  bills: Bill[];
  loading: boolean;
  isAdmin: boolean;
  showToast?: (msg: string, type?: 'ok' | 'err') => void;
  onSave: (wo: Partial<WorkOrder>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────

interface WOFamily {
  _rootKey: string;
  _members: WorkOrder[];
  _totalWoValue: number;
  _totalBilled: number;
  _balance: number;
  _pct: number;
  _billCount: number;
  _latestEnd: string | null;
  _hasAmendments: boolean;
  id: string;
  wo_no: string;
  site: string;
  description: string;
  start_date?: string;
}

function fmt(n: number | string | undefined): string {
  return parseFloat(String(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Component ────────────────────────────────────────────────────────

export const WorkOrdersTab: React.FC<Props> = ({
  workOrders, bills, loading, isAdmin,
  showToast = () => {}, onSave, onDelete
}) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WOFamily | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, any>>({ wo_no: '', site: '', description: '', wo_value: '', start_date: '', end_date: '', parent_wo_no: '', amendment_no: 0 });
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Family tree computation ────────────────────────────────────────

  const getRoot = (wo: WorkOrder) => (wo.parent_wo_no || wo.wo_no).trim();
  const getAmendNo = (wo: WorkOrder) => parseInt(String(wo.amendment_no ?? 0)) || 0;

  const { enriched, extraWoNos } = useMemo(() => {
    const fam: Record<string, WorkOrder[]> = {};
    workOrders.forEach(wo => {
      const root = getRoot(wo).toLowerCase();
      if (!fam[root]) fam[root] = [];
      fam[root].push(wo);
    });

    const enrichedList = Object.keys(fam).map(rootKey => {
      const members = fam[rootKey].slice().sort((a, b) => getAmendNo(a) - getAmendNo(b));
      const rootWo = members[0];
      const totalWoValue = members.reduce((s, w) => s + parseFloat(String(w.wo_value || 0)), 0);
      const latestEnd = members.reduce<string | null>((lat, w) => (!w.end_date ? lat : (!lat || w.end_date > lat ? w.end_date : lat)), null);
      const allWoNos = new Set(members.map(w => w.wo_no.trim().toLowerCase()));
      const fBills = bills.filter(b => b.wo_no && allWoNos.has(b.wo_no.trim().toLowerCase()) && b.bill_status !== 'CANCELLED');
      const totalBilled = fBills.reduce((s, b) => s + parseFloat(String(b.amount_with_gst || b.amount || 0)), 0);
      const balance = totalWoValue - totalBilled;
      const pct = totalWoValue > 0 ? Math.min(100, (totalBilled / totalWoValue) * 100) : 0;
      return {
        _rootKey: rootKey, _members: members, _totalWoValue: totalWoValue,
        _totalBilled: totalBilled, _balance: balance, _pct: pct,
        _billCount: fBills.length, _latestEnd: latestEnd, _hasAmendments: members.length > 1,
        id: rootWo.id, wo_no: rootWo.wo_no, site: rootWo.site,
        description: rootWo.description, start_date: rootWo.start_date
      } as WOFamily;
    });

    const knownWoNos = new Set(workOrders.map(w => w.wo_no.trim().toLowerCase()));
    const extra: { key: string; wo_no: string }[] = [];
    bills.forEach(b => {
      if (b.wo_no && !knownWoNos.has(b.wo_no.trim().toLowerCase())) {
        const key = b.wo_no.trim().toLowerCase();
        if (!extra.find(e => e.key === key)) extra.push({ key, wo_no: b.wo_no.trim() });
      }
    });

    return { enriched: enrichedList, extraWoNos: extra };
  }, [workOrders, bills]);

  const filtered = enriched.filter(w =>
    !search || w.wo_no.toLowerCase().includes(search.toLowerCase())
    || (w.description || '').toLowerCase().includes(search.toLowerCase())
    || (w.site || '').toLowerCase().includes(search.toLowerCase())
    || w._members.some(m => m.wo_no.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Add / Amendment ────────────────────────────────────────────────

  const handleSaveWO = async () => {
    if (!addForm.wo_no.trim() || !addForm.wo_value) { showToast('WO Number and Value are required.', 'err'); return; }
    if (addForm.start_date && addForm.end_date && addForm.end_date < addForm.start_date) { showToast('End Date cannot be before Start Date.', 'err'); return; }
    try {
      await onSave({
        wo_no: addForm.wo_no.trim(),
        site: addForm.site || '',
        description: addForm.description || '',
        wo_value: parseFloat(addForm.wo_value) || 0,
        start_date: addForm.start_date || undefined,
        end_date: addForm.end_date || undefined,
        parent_wo_no: addForm.parent_wo_no || undefined,
        amendment_no: addForm.amendment_no || 0,
      });
      showToast(addForm.parent_wo_no ? 'Amendment saved ✔' : 'Work Order saved ✔');
      setShowAdd(false);
      setAddForm({ wo_no: '', site: '', description: '', wo_value: '', start_date: '', end_date: '', parent_wo_no: '', amendment_no: 0 });
    } catch {
      showToast('Save error', 'err');
    }
  };

  const startAmendment = (fam: WOFamily) => {
    const nextNo = fam._members.length;
    setAddForm({
      wo_no: fam.wo_no + '-' + nextNo,
      site: fam.site || '',
      description: '',
      wo_value: '',
      start_date: fam._latestEnd || '',
      end_date: '',
      parent_wo_no: fam.wo_no,
      amendment_no: nextNo,
    });
    setShowAdd(true);
  };

  // ── Excel Import ───────────────────────────────────────────────────

  const handleImportFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        // @ts-ignore — XLSX loaded globally or via CDN
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // @ts-ignore
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed = (rows as any[]).map(r => ({
          wo_no: String(r['WO Number'] || r['wo_no'] || r['WO No'] || '').trim(),
          site: String(r['Site'] || r['site'] || '').trim(),
          description: String(r['Description'] || r['description'] || r['Details'] || '').trim(),
          wo_value: parseFloat(r['WO Value'] || r['wo_value'] || r['Value'] || r['Amount'] || 0) || 0,
          start_date: r['Start Date'] || r['start_date'] || null,
          end_date: r['End Date'] || r['end_date'] || null,
          parent_wo_no: String(r['Parent WO'] || r['parent_wo_no'] || '').trim() || null,
          amendment_no: parseInt(r['Amendment No'] || r['amendment_no'] || 0) || 0,
        })).filter(r => r.wo_no);

        if (!parsed.length) { showToast('No valid rows found', 'err'); return; }

        const existing = new Set(workOrders.map(w => w.wo_no.trim().toLowerCase()));
        const preview = parsed.map(r => ({ ...r, _dup: existing.has(r.wo_no.toLowerCase()) }));
        setImportPreview(preview);
      } catch (err: any) { showToast('Failed to read file: ' + err.message, 'err'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async (rows: any[]) => {
    setImporting(true);
    for (const r of rows) {
      try {
        await onSave({
          wo_no: r.wo_no, site: r.site || '', description: r.description || '',
          wo_value: r.wo_value, start_date: r.start_date || undefined,
          end_date: r.end_date || undefined, parent_wo_no: r.parent_wo_no || undefined,
          amendment_no: r.amendment_no || 0,
        });
      } catch { /* continue */ }
    }
    setImporting(false);
    setImportPreview(null);
    const newCount = rows.filter((r: any) => !r._dup).length;
    const updateCount = rows.filter((r: any) => r._dup).length;
    showToast('Imported ' + newCount + ' new, updated ' + updateCount + ' ✔');
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }}
          placeholder="Search WO number, description, site..."
          style={{ maxWidth: 300, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', flex: 1 }} />
        {isAdmin && <Button onClick={() => setShowAdd(true)} style={{ fontSize: 11 }}>+ Add Work Order</Button>}
        {isAdmin && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}>
            ⬆ Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { handleImportFile(e.target.files?.[0] || null); if (e.target) e.target.value = ''; }} />
          </label>
        )}
      </div>

      {/* Import preview */}
      {importPreview && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>⬆ Import Preview — {importPreview.length} rows</div>
            <Button variant="ghost" onClick={() => setImportPreview(null)} style={{ fontSize: 10 }}>✕ Cancel</Button>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '2px 8px', borderRadius: 20, marginRight: 6 }}>{importPreview.filter(r => !r._dup).length} new</span>
            <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', padding: '2px 8px', borderRadius: 20 }}>{importPreview.filter(r => r._dup).length} will update</span>
          </div>
          <div style={{ overflowX: 'auto', marginBottom: 12, maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{['WO Number', 'Site', 'Description', 'WO Value', 'Status'].map(h =>
                  <th key={h} style={{ padding: '7px 10px', background: '#0f172a', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'left', position: 'sticky', top: 0 }}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {importPreview.map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: r._dup ? '#fff7ed' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '7px 10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#f97316' }}>{r.wo_no}</td>
                    <td style={{ padding: '7px 10px' }}>{r.site || '-'}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '-'}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'IBM Plex Mono, monospace' }}>₹{fmt(r.wo_value)}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ background: r._dup ? '#fff7ed' : '#f0fdf4', color: r._dup ? '#ea580c' : '#16a34a', border: '1px solid ' + (r._dup ? '#fed7aa' : '#bbf7d0'), borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{r._dup ? 'UPDATE' : 'NEW'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => confirmImport(importPreview)} loading={importing} style={{ fontSize: 11 }}>
              {importing ? 'Importing...' : 'Confirm Import (' + importPreview.length + ' rows)'}
            </Button>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Add WO form */}
      {showAdd && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: addForm.parent_wo_no ? '#d97706' : '#16a34a', marginBottom: 12 }}>
            {addForm.parent_wo_no ? 'Amendment to: ' + addForm.parent_wo_no : '✚ Register New Work Order'}
          </div>
          {addForm.parent_wo_no && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#92400e', marginBottom: 10 }}>
              Amendment #{addForm.amendment_no} — Enter additional scope/value for this amendment only.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>{addForm.parent_wo_no ? 'AMENDMENT WO NUMBER *' : 'WO NUMBER *'}</div>
              <input value={addForm.wo_no} onChange={e => setAddForm(p => ({ ...p, wo_no: e.target.value }))} placeholder={addForm.parent_wo_no ? addForm.parent_wo_no + '-1' : 'e.g. MRPL/WO/2024/001'}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SITE</div>
              <input value={addForm.site} onChange={e => setAddForm(p => ({ ...p, site: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>{addForm.parent_wo_no ? 'ADDITIONAL VALUE (₹) *' : 'WO VALUE (₹) *'}</div>
              <input type="number" value={addForm.wo_value} onChange={e => setAddForm(p => ({ ...p, wo_value: e.target.value }))} placeholder="0"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>DESCRIPTION</div>
              <input value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>START DATE</div>
              <input type="date" value={addForm.start_date || ''} onChange={e => setAddForm(p => ({ ...p, start_date: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>{addForm.parent_wo_no ? 'EXTENDED END DATE' : 'END DATE'}</div>
              <input type="date" value={addForm.end_date || ''} onChange={e => setAddForm(p => ({ ...p, end_date: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleSaveWO} style={{ fontSize: 11 }}>{addForm.parent_wo_no ? 'Save Amendment' : 'Save WO'}</Button>
            <Button variant="ghost" onClick={() => { setShowAdd(false); setAddForm({ wo_no: '', site: '', description: '', wo_value: '', start_date: '', end_date: '', parent_wo_no: '', amendment_no: 0 }); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* WO Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 11 }}>Loading work orders...</div>
      ) : workOrders.length === 0 && extraWoNos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📑</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No Work Orders registered yet</div>
          <div style={{ fontSize: 12 }}>{isAdmin ? "Click + Add Work Order to register WO values." : "Ask Admin to register Work Order values."}</div>
        </div>
      ) : (
        <DataTable<WOFamily | { key: string; wo_no: string; _isExtra: boolean }>
          columns={[
            {
              header: 'WO Number',
              width: 140,
              render: (w) => {
                if ('_isExtra' in w) return <span style={{ fontWeight: 700, color: '#d97706', fontFamily: 'IBM Plex Mono, monospace' }}>{w.wo_no}</span>;
                return (
                  <span style={{ fontWeight: 700, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                    {w.wo_no}
                    {w._hasAmendments && <span style={{ marginLeft: 4, background: '#fef9c3', border: '1px solid #fde047', color: '#92400e', borderRadius: 20, padding: '1px 5px', fontSize: 9, fontWeight: 700 }}>{w._members.length - 1} amdt</span>}
                  </span>
                );
              }
            },
            {
              header: 'Date Range',
              width: 150,
              render: (w) => {
                if ('_isExtra' in w) return null;
                return <span style={{ fontSize: 11, color: '#64748b' }}>{w.start_date ? fmtDate(w.start_date) : '--'} → {w._latestEnd ? fmtDate(w._latestEnd) : '--'}</span>;
              }
            },
            {
              header: 'Site',
              width: 100,
              render: (w) => {
                const site = ('site' in w) ? w.site : '';
                if (!site) return '-';
                return <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{site}</span>;
              }
            },
            {
              header: 'Description',
              render: (w) => {
                if ('_isExtra' in w) return <span style={{ fontSize: 11, color: '#92400e' }}>⚠️ WO found in bills but not registered. Register to track.</span>;
                return <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{w.description || '-'}</div>;
              }
            },
            {
              header: 'Total Value',
              width: 110,
              render: (w) => {
                if ('_isExtra' in w) return '--';
                return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>₹{fmt(w._totalWoValue)}</span>;
              }
            },
            {
              header: 'Billed',
              width: 110,
              render: (w) => {
                if ('_isExtra' in w) return '--';
                return <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#f97316', fontWeight: 600 }}>₹{fmt(w._totalBilled)}</span>;
              }
            },
            {
              header: 'Balance',
              width: 110,
              render: (w) => {
                if ('_isExtra' in w) return '--';
                return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: w._balance < 0 ? '#dc2626' : '#16a34a' }}>₹{fmt(w._balance)}</span>;
              }
            },
            {
              header: 'Bills',
              width: 50,
              render: (w) => {
                if ('_isExtra' in w) return null;
                return <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{w._billCount}</span>;
              }
            },
            {
              header: 'Utilisation',
              width: 100,
              render: (w) => {
                if ('_isExtra' in w) return null;
                const pct = w._pct;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: pct + '%', height: '100%', background: pct > 90 ? '#dc2626' : pct > 70 ? '#f97316' : '#16a34a', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#64748b', minWidth: 28 }}>{pct.toFixed(0)}%</span>
                  </div>
                );
              }
            },
            {
              header: 'Actions',
              width: 100,
              render: (w) => {
                if ('_isExtra' in w) return null;
                return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); startAmendment(w); }} style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#d97706', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>+Amdt</button>}
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete all WOs in this family (' + w._members.length + ' records)?')) w._members.forEach(m => onDelete(m.id)); }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                );
              }
            }
          ]}
          data={[...filtered, ...extraWoNos.filter(e => !search || e.wo_no.toLowerCase().includes(search.toLowerCase())).map(e => ({ ...e, _isExtra: true }))]}
          onRowClick={(w) => {
            if ('_isExtra' in w) return;
            setSelected(selected && selected._rootKey === w._rootKey ? null : w);
          } }
          rowStyle={(w) => (!('_isExtra' in w) && selected && selected._rootKey === w._rootKey) ? { background: '#eff6ff' } : {}}
          initialPageSize={20}
        />
      )}

      {/* ── Selected WO detail panel ────────────────────────────────── */}
      {selected && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginTop: 8, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                {selected.wo_no}
                {selected._hasAmendments && <span style={{ marginLeft: 8, background: '#fef9c3', border: '1px solid #fde047', color: '#92400e', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{selected._members.length - 1} Amendment(s)</span>}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                {selected.start_date ? 'Start: ' + fmtDate(selected.start_date) : ''}
                {selected._latestEnd ? (selected.start_date ? '  →  ' : '') + 'End: ' + fmtDate(selected._latestEnd) : ''}
              </div>
              {selected.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.description}</div>}
            </div>
            <Button variant="ghost" onClick={() => setSelected(null)} style={{ fontSize: 10 }}>✕ Close</Button>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { l: 'Total WO Value', v: '₹' + fmt(selected._totalWoValue), c: '#0f172a' },
              { l: 'Total Billed', v: '₹' + fmt(selected._totalBilled), c: '#f97316' },
              { l: 'Balance', v: '₹' + fmt(selected._balance), c: selected._balance < 0 ? '#dc2626' : '#16a34a' },
              { l: 'Utilisation', v: selected._pct.toFixed(1) + '%', c: selected._pct > 90 ? '#dc2626' : '#0369a1' },
            ].map(s => (
              <div key={s.l} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.c, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Amendment timeline */}
          {selected._hasAmendments && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase' }}>Amendment Timeline</div>
              <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                {selected._members.map((m, mi) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ background: mi === 0 ? '#f0fdf4' : '#fffbeb', border: '1px solid ' + (mi === 0 ? '#bbf7d0' : '#fde68a'), borderRadius: 8, padding: '8px 12px', minWidth: 160, fontSize: 11 }}>
                      <div style={{ fontWeight: 700, color: mi === 0 ? '#16a34a' : '#d97706', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{m.wo_no}</div>
                      {m.start_date && <div style={{ color: '#64748b', marginTop: 3 }}>{fmtDate(m.start_date)}</div>}
                      {m.end_date && <div style={{ color: '#64748b' }}>→ {fmtDate(m.end_date)}</div>}
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 3 }}>₹{fmt(m.wo_value)}{mi > 0 ? ' (addl)' : ''}</div>
                    </div>
                    {mi < selected._members.length - 1 && <div style={{ color: '#d97706', fontSize: 18, fontWeight: 700, padding: '0 6px' }}>→</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bills list */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase' }}>Bills Raised Against This WO Family</div>
            {(() => {
              const allNos = new Set(selected._members.map(m => m.wo_no.trim().toLowerCase()));
              const woBills = bills.filter(b => b.wo_no && allNos.has(b.wo_no.trim().toLowerCase()));
              if (!woBills.length) return <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>No bills found for this WO family.</div>;
              return (
                <DataTable<Bill>
                  data={woBills}
                  emptyMessage="No bills found"
                  initialPageSize={10}
                  pageSizeOptions={[10, 25, 50]}
                  columns={[
                    { header: 'Inv No', render: (b) => <span style={{ fontWeight: 700, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace' }}>{b.inv_no}</span> },
                    { header: 'WO', render: (b) => <span style={{ fontSize: 10, color: '#64748b' }}>{b.wo_no}</span> },
                    { header: 'Site', render: (b) => <span style={{ fontSize: 10, color: '#64748b' }}>{b.site}</span> },
                    { header: 'Details', render: (b) => <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{b.bill_details}</span> },
                    { header: 'Amount', render: (b) => <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{fmtINR(b.amount)}</span>, align: 'right' },
                    { header: 'With GST', render: (b) => <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{fmtINR(b.amount_with_gst)}</span>, align: 'right' },
                    { header: 'Status', render: (b) => (
                      <span style={{ borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700,
                        background: b.bill_status === 'RECEIVED' ? '#f0fdf4' : b.bill_status === 'CANCELLED' ? '#f1f5f9' : '#fff7ed',
                        color: b.bill_status === 'RECEIVED' ? '#16a34a' : b.bill_status === 'CANCELLED' ? '#94a3b8' : '#ea580c',
                        border: '1px solid ' + (b.bill_status === 'RECEIVED' ? '#bbf7d0' : b.bill_status === 'CANCELLED' ? '#e2e8f0' : '#fed7aa')
                      }}>{b.bill_status}</span>
                    )},
                  ]}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
