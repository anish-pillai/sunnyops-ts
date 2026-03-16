import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Quotation, QuotationItem } from '@/types/procurement.types';
import { UNITS } from '@/config/constants';
import { db } from '@/config/supabase';

interface Props {
  initial?: Quotation;
  onSave: (q: Partial<Quotation>) => Promise<void>;
  onClose: () => void;
}

const getFinYear = () => {
    const now = new Date();
    const fyS = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return (fyS % 100) + "-" + ((fyS + 1) % 100);
};

export const QuotationFormModal: React.FC<Props> = ({ initial, onSave, onClose }) => {
  const [f, setF] = useState<Partial<Quotation>>(initial || {
    ref_no: '',
    type: 'QUT' as any,
    firm: 'opc' as any,
    client_name: '' as any,
    client_gstin: '' as any,
    client_address: '' as any,
    site: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', qty: 1, unit: 'Nos', rate: 0, amount: 0 }],
    status: 'Draft',
    terms: '1. Prices valid for 30 days.\n2. Payment within 30 days of invoice.\n3. GST extra.'
  } as any);

  const upd = (k: keyof Quotation, v: any) => setF({ ...f, [k]: v });

  const updRow = (i: number, k: keyof QuotationItem, v: any) => {
    const items = [...(f.items || [])];
    items[i] = { ...items[i], [k]: v };
    const rate = parseFloat(String(items[i].rate || 0));
    const qty = parseFloat(String(items[i].qty || 0));
    items[i].amount = rate * qty;
    setF({ ...f, items });
  };

  const addRow = () => {
    setF({ ...f, items: [...(f.items || []), { description: '', qty: 1, unit: 'Nos', rate: 0, amount: 0 }] });
  };

  const delRow = (i: number) => {
    setF({ ...f, items: (f.items || []).filter((_, j) => j !== i) });
  };

  const calculateTotal = () => {
    return (f.items || []).reduce((s, it) => s + (it.amount || 0), 0);
  };

  const total = calculateTotal();

  const handleSave = async (status: Quotation['status']) => {
    if (!f.ref_no) return alert('Ref Number is required');
    if (!(f as any).client_name) return alert('Client name is required');
    
    await onSave({
      ...f,
      status,
      total,
    });
  };

  const genRefNo = async () => {
    try {
      const { data } = await db.from("app_settings").select("*").eq("key", "se_counter").single();
      const cur = data?.value != null ? parseInt(data.value) : 461;
      const next = cur + 1;
      const newNo = `SE${next}-${(f as any).type || 'QUT'}-${getFinYear()}`;
      await db.from("app_settings").upsert({ key: "se_counter", value: next });
      upd('ref_no', newNo);
    } catch (e) {
      console.error(e);
      alert('Error generating ref no');
    }
  };

  const iS: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };
  const lS: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={lS}>Ref Number</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={iS} value={f.ref_no} onChange={e => upd('ref_no', e.target.value)} placeholder="e.g. SE462-QUT-25-26" />
            {!initial && <Button onClick={genRefNo} style={{ whiteSpace: 'nowrap', fontSize: 10 }}>⚡ Auto</Button>}
          </div>
        </div>
        <div>
          <label style={lS}>Type</label>
          <select style={iS} value={(f as any).type} onChange={e => upd('type' as any, e.target.value)}>
            <option value="QUT">Quotation (QUT)</option>
            <option value="BUD">Budgetary (BUD)</option>
          </select>
        </div>
        <div>
          <label style={lS}>Status</label>
          <select style={iS} value={f.status} onChange={e => upd('status', e.target.value)}>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lS}>Client Name</label>
          <input style={iS} value={(f as any).client_name} onChange={e => upd('client_name' as any, e.target.value)} placeholder="Company or person name" />
        </div>
        <div>
          <label style={lS}>Client GSTIN</label>
          <input style={iS} value={(f as any).client_gstin} onChange={e => upd('client_gstin' as any, e.target.value)} placeholder="GSTIN" />
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={lS}>Line Items</span>
          <Button variant="ghost" onClick={addRow} style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}>+ Add Row</Button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {(f.items || []).map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...iS, flex: 3 }} value={it.description} onChange={e => updRow(i, 'description', e.target.value)} placeholder="Item description" />
              <input type="number" style={{ ...iS, flex: 1 }} value={it.qty} onChange={e => updRow(i, 'qty', e.target.value)} placeholder="Qty" />
              <input type="number" style={{ ...iS, flex: 1 }} value={it.rate} onChange={e => updRow(i, 'rate', e.target.value)} placeholder="Rate" />
              <select style={{ ...iS, flex: 1 }} value={it.unit} onChange={e => updRow(i, 'unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div style={{ width: 80, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>₹{(it.amount || 0).toLocaleString()}</div>
              {(f.items || []).length > 1 && (
                <button onClick={() => delRow(i)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total (Excl. GST): ₹{total.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <label style={lS}>Terms & Conditions</label>
        <textarea style={{ ...iS, height: 60 }} value={f.terms} onChange={e => upd('terms', e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Button onClick={() => handleSave('Sent')} style={{ flex: 1, background: '#7c3aed' }}>Save & Mark Sent</Button>
        <Button variant="ghost" onClick={() => handleSave('Draft')} style={{ flex: 1 }}>Save as Draft</Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
      </div>
    </div>
  );
};
