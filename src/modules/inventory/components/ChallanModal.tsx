import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DEFAULT_SITE_DETAILS } from '@/config/constants';
import type { InventoryItem } from '@/types/inventory.types';

interface Props {
  items: InventoryItem[];
  onSave: (data: any, item: InventoryItem) => void;
  onClose: () => void;
  saving?: boolean;
}

const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);

export const ChallanModal: React.FC<Props> = ({ items, onSave, onClose, saving }) => {
  const [f, setF] = useState({
    itemId: '',
    qty: 1,
    fromSite: SITES[0] || 'MRPL',
    toSite: SITES[1] || 'MEIL',
    remarks: '',
    requestedBy: ''
  });

  const sel = items.find(i => i.id === f.itemId);

  const sf = (k: keyof typeof f, v: string | number) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.itemId) return alert('Select item');
    if (f.fromSite === f.toSite) return alert('From and To sites must be different');
    if (f.qty < 1) return alert('Quantity must be at least 1');
    if (sel && f.qty > sel.qty) {
      if (!window.confirm(`Requested qty (${f.qty}) exceeds available stock (${sel.qty}). Continue anyway?`)) {
        return;
      }
    }
    onSave(f, sel!);
  };

  const inpStyles = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' as const };
  const labelStyles = { fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 };

  return (
    <Modal title="Create Delivery Challan" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyles}>SELECT EQUIPMENT *</label>
          <select value={f.itemId} onChange={e => sf('itemId', e.target.value)} style={inpStyles}>
            <option value="">-- Select item --</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.site} - Qty: {i.qty})
              </option>
            ))}
          </select>
        </div>

        {sel && (
          <div style={{ gridColumn: '1/-1', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#374151' }}>
            Current Qty: <b style={{ color: '#f97316' }}>{sel.qty} {sel.unit}</b> at <b>{sel.site}</b>
          </div>
        )}

        <div>
          <label style={labelStyles}>FROM SITE</label>
          <select value={f.fromSite} onChange={e => sf('fromSite', e.target.value)} style={{ ...inpStyles, background: '#f8fafc' }}>
            {SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyles}>TO SITE</label>
          <select value={f.toSite} onChange={e => sf('toSite', e.target.value)} style={{ ...inpStyles, background: '#f8fafc' }}>
            {SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyles}>QUANTITY</label>
          <input type="number" min="1" value={f.qty} onChange={e => sf('qty', Number(e.target.value))} style={inpStyles} />
        </div>
        <div>
          <label style={labelStyles}>REQUESTED BY</label>
          <input type="text" value={f.requestedBy} onChange={e => sf('requestedBy', e.target.value)} placeholder="Name of requester..." style={inpStyles} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyles}>REMARKS</label>
          <input type="text" value={f.remarks} onChange={e => sf('remarks', e.target.value)} placeholder="Optional notes..." style={inpStyles} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <Button onClick={submit} loading={saving} style={{ flex: 1, padding: '11px 0' }}>
          {saving ? 'Creating...' : 'Create Challan'}
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
