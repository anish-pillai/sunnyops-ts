import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { fmtINR } from '@/utils/formatters';
import type { StoreItem } from '@/types/store.types';
import { db } from '@/config/supabase';
import { DEFAULT_SITE_DETAILS, STORE_CATEGORIES, UNITS } from '@/config/constants';

const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);

interface Props {
  uName: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
  existingItems: StoreItem[];
}

interface GRNRow {
  name: string;
  category: string;
  unit: string;
  qty: number;
  unit_cost: number;
}

const blankRow: GRNRow = { name: '', category: 'General', unit: 'Nos', qty: 1, unit_cost: 0 };

/**
 * GRN Multi-Item Entry Form.
 * Bill header entered once, multiple item rows can be added.
 * Supports duplicate bill check per site.
 */
export const GRNEntryForm: React.FC<Props> = ({ uName, onClose, onSaved, showToast, existingItems }) => {
  const [billNo, setBillNo] = useState('');
  const [site, setSite] = useState('MRPL');
  const [supplier, setSupplier] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<GRNRow[]>([{ ...blankRow }]);
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState('');

  const checkDuplicate = (bn: string, s: string) => {
    if (!bn) { setDupWarning(''); return; }
    const existing = existingItems.filter(i => i.bill_no === bn && i.site === s);
    if (existing.length > 0) {
      setDupWarning(`⚠ Bill "${bn}" already has ${existing.length} item(s) at ${s}. You can still add more.`);
    } else {
      setDupWarning('');
    }
  };

  const updateRow = (idx: number, key: keyof GRNRow, val: any) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: val };
    setRows(next);
  };

  const addRow = () => setRows([...rows, { ...blankRow }]);
  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const total = useMemo(() => rows.reduce((s, r) => s + (r.qty * r.unit_cost), 0), [rows]);

  const handleSaveAll = async () => {
    if (!billNo.trim()) return showToast('Bill number required', 'err');
    if (!supplier.trim()) return showToast('Supplier required', 'err');
    const validRows = rows.filter(r => r.name.trim());
    if (validRows.length === 0) return showToast('Add at least one item', 'err');

    setSaving(true);
    try {
      for (const row of validRows) {
        // Check if item already exists at this site
        const existing = existingItems.find(i =>
          i.name.toLowerCase() === row.name.toLowerCase() && i.site === site
        );

        if (existing) {
          // Accumulate qty
          await db.from('store_items').update({
            qty: existing.qty + row.qty,
            unit_cost: row.unit_cost || existing.unit_cost,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          // Insert new
          await db.from('store_items').insert([{
            name: row.name,
            category: row.category,
            unit: row.unit,
            qty: row.qty,
            min_qty: 1,
            unit_cost: row.unit_cost,
            site,
            bill_no: billNo,
            supplier,
            created_by_name: uName,
          }]);
        }

        // Log STOCK-IN activity
        await db.from('store_issues').insert([{
          item_id: existing?.id || '',
          item_name: row.name,
          site,
          qty: row.qty,
          issued_to: supplier,
          work_order: 'STOCK-IN',
          type: 'Stock In',
          purpose: `GRN — Bill: ${billNo}`,
          issued_by: uName,
          issued_at: new Date().toISOString(),
        }]);
      }

      showToast(`✔ ${validRows.length} item(s) saved`);
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error saving GRN', 'err');
    } finally {
      setSaving(false);
    }
  };

  const iS: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' };
  const lS: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Bill Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={lS}>Bill No *</label>
          <input style={iS} value={billNo} onChange={e => { setBillNo(e.target.value); checkDuplicate(e.target.value, site); }} placeholder="e.g. INV-001" />
        </div>
        <div>
          <label style={lS}>Site</label>
          <select style={iS} value={site} onChange={e => { setSite(e.target.value); checkDuplicate(billNo, e.target.value); }}>
            {SITES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lS}>Supplier *</label>
          <input style={iS} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
        </div>
        <div>
          <label style={lS}>Date</label>
          <input type="date" style={iS} value={billDate} onChange={e => setBillDate(e.target.value)} />
        </div>
      </div>

      {dupWarning && (
        <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#d97706' }}>
          {dupWarning}
        </div>
      )}

      {/* Item Rows */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ ...lS, marginBottom: 0 }}>Items</span>
          <Button variant="ghost" onClick={addRow} style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}>+ Add Row</Button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input style={{ ...iS, flex: 3 }} value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Material name" />
              <select style={{ ...iS, flex: 1 }} value={row.category} onChange={e => updateRow(i, 'category', e.target.value)}>
                {STORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select style={{ ...iS, flex: 1 }} value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <input
                type="number"
                inputMode="numeric"
                style={{ ...iS, flex: 1, textAlign: 'right' }}
                value={row.qty || ''}
                onChange={e => updateRow(i, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={e => updateRow(i, 'qty', Math.max(1, Number(e.target.value) || 1))}
                placeholder="Qty"
              />
              <input
                type="number"
                style={{ ...iS, flex: 1, textAlign: 'right' }}
                value={row.unit_cost || ''}
                onChange={e => updateRow(i, 'unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={e => updateRow(i, 'unit_cost', Math.max(0, Number(e.target.value) || 0))}
                placeholder="Rate"
              />
              <div style={{ width: 80, textAlign: 'right', fontSize: 12, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                {fmtINR(row.qty * row.unit_cost)}
              </div>
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>
            Total: {fmtINR(total)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button onClick={handleSaveAll} loading={saving} style={{ flex: 1, padding: '11px 0' }}>
          ✔ Save All Items ({rows.filter(r => r.name.trim()).length})
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>Cancel</Button>
      </div>
    </div>
  );
};
