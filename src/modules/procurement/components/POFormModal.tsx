import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PurchaseOrder, POLineItem } from '@/types/procurement.types';
import { FIRMS, UNITS } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  initial?: PurchaseOrder;
  onSave: (po: Partial<PurchaseOrder>) => Promise<void>;
  onClose: () => void;
}

export const POFormModal: React.FC<Props> = ({ initial, onSave, onClose }) => {
  const { user } = useAuth();
  const [f, setF] = useState<Partial<PurchaseOrder>>(initial || {
    po_no: '',
    firm: 'opc' as any,
    site: '',
    vendor_name: '',
    vendor_email: '' as any,
    vendor_address: '',
    vendor_gstin: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', qty: 1, unit: 'Nos', rate: 0, amount: 0, gst_rate: 18, cgst: 0, sgst: 0, igst: 0 }],
    status: 'Draft',
    terms: '1. Delivery within 7 days.\n2. Payment within 30 days.'
  });

  const upd = (k: keyof PurchaseOrder, v: any) => setF({ ...f, [k]: v });

  const updRow = (i: number, k: keyof POLineItem, v: any) => {
    const items = [...(f.items || [])];
    items[i] = { ...items[i], [k]: v };
    // Recalculate amounts
    const rate = parseFloat(String(items[i].rate || 0));
    const qty = parseFloat(String(items[i].qty || 0));
    const amt = rate * qty;
    items[i].amount = amt;
    
    setF({ ...f, items });
  };

  const addRow = () => {
    setF({ ...f, items: [...(f.items || []), { description: '', qty: 1, unit: 'Nos', rate: 0, amount: 0, gst_rate: 18, cgst: 0, sgst: 0, igst: 0 }] });
  };

  const delRow = (i: number) => {
    setF({ ...f, items: (f.items || []).filter((_, j) => j !== i) });
  };

  const calculateTotals = () => {
    const items = f.items || [];
    const sub_total = items.reduce((s, it) => s + (it.amount || 0), 0);
    const total_gst = sub_total * 0.18; // Simple 18% for now matching old logic 
    const grand_total = sub_total + total_gst;
    return { sub_total, total_gst, grand_total };
  };

  const { sub_total, total_gst, grand_total } = calculateTotals();

  const handleSave = async (status: PurchaseOrder['status']) => {
    if (!f.po_no) return alert('PO Number is required');
    if (!f.vendor_name) return alert('Vendor is required');
    
    await onSave({
      ...f,
      status,
      sub_total,
      total_gst,
      grand_total,
      created_by: f.created_by || user?.email || 'Admin'
    });
  };

  const iS: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };
  const lS: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={lS}>PO Number</label>
          <input style={iS} value={f.po_no} onChange={e => upd('po_no', e.target.value)} placeholder="e.g. PO-101" />
        </div>
        <div>
          <label style={lS}>Firm</label>
          <select style={iS} value={(f as any).firm} onChange={e => upd('firm' as any, e.target.value)}>
            {FIRMS.map(fi => <option key={fi.key} value={fi.key}>{fi.short}</option>)}
          </select>
        </div>
        <div>
          <label style={lS}>Date</label>
          <input type="date" style={iS} value={f.date?.split('T')[0]} onChange={e => upd('date', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lS}>Vendor Name</label>
          <input style={iS} value={f.vendor_name} onChange={e => upd('vendor_name', e.target.value)} placeholder="Enter vendor name" />
        </div>
        <div>
          <label style={lS}>Vendor GSTIN</label>
          <input style={iS} value={f.vendor_gstin} onChange={e => upd('vendor_gstin', e.target.value)} placeholder="GSTIN" />
        </div>
      </div>

      <div>
        <label style={lS}>Delivery Site</label>
        <input style={iS} value={f.site} onChange={e => upd('site', e.target.value)} placeholder="Site / Godown" />
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={lS}>Line Items</span>
          <Button variant="ghost" onClick={addRow} style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}>+ Add Item</Button>
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
          <div style={{ fontSize: 12, color: '#64748b' }}>Subtotal: ₹{sub_total.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>GST (18%): ₹{total_gst.toLocaleString()}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total: ₹{grand_total.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <label style={lS}>Terms & Conditions</label>
        <textarea style={{ ...iS, height: 60 }} value={f.terms} onChange={e => upd('terms', e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Button onClick={() => handleSave('Pending Purchase')} style={{ flex: 1, background: '#7c3aed' }}>Save & Approvable</Button>
        <Button variant="ghost" onClick={() => handleSave('Draft')} style={{ flex: 1 }}>Save as Draft</Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
      </div>
    </div>
  );
};
