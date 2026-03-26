import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { colors, fonts } from '@/styles/tokens';
import type { InventoryItem } from '@/types/inventory.types';

interface Props {
  item: InventoryItem;
  allItems?: InventoryItem[];
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  isAdmin: boolean;
}

export const InventoryDetailPopup: React.FC<Props> = ({ item, allItems, onClose, onEdit, isAdmin }) => {
  const relatedItems = allItems ? allItems.filter(i => i.name.toLowerCase() === item.name.toLowerCase()) : [item];
  const totalQty = relatedItems.reduce((acc, curr) => acc + curr.qty, 0);
  const isLow = item.qty <= item.min_qty;
  const isCondBad = item.condition === 'Poor' || item.condition === 'Condemned';
  const isTpiExp = item.tpi_expiry && new Date(item.tpi_expiry) < new Date();

  const getStatus = () => {
    if (isCondBad) return { label: item.condition.toUpperCase(), color: colors.danger, bg: colors.dangerBg };
    if (isTpiExp) return { label: 'TPI EXPIRED', color: colors.danger, bg: colors.dangerBg };
    if (isLow) return { label: 'LOW STOCK', color: colors.warningDark, bg: colors.warningBg };
    return { label: 'OPERATIONAL', color: colors.success, bg: colors.successBg };
  };

  const status = getStatus();

  const LabelValue = ({ label, value, full = false }: { label: string, value: React.ReactNode, full?: boolean }) => (
    <div style={{ padding: '5px 0', borderBottom: `1px solid ${colors.slate100}`, gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 9, color: colors.slate500, fontFamily: fonts.mono, letterSpacing: 1, marginBottom: 1, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, color: colors.slate900, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );

  return (
    <Modal 
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Equipment Details</span>
          <span style={{ 
            fontSize: 9, 
            background: status.bg, 
            color: status.color, 
            padding: '2px 7px', 
            borderRadius: 4, 
            fontWeight: 800, 
            letterSpacing: 0.5,
            border: `1px solid ${status.color}44`
          }}>
            {status.label}
          </span>
        </div>
      )} 
      onClose={onClose}
    >
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.slate900, letterSpacing: -0.5 }}>{item.name}</h2>
        {item.alias && (
          <div style={{ fontSize: 10, color: colors.brand, fontFamily: fonts.mono, marginTop: 1, fontWeight: 600 }}>
            {item.alias}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <LabelValue label="Serial / Tag No" value={item.serial_no} />
        <LabelValue label="Category" value={item.category} />
        <LabelValue label="Unit" value={item.unit} />
        <LabelValue label="Condition" value={<span style={{ color: isCondBad ? colors.danger : colors.success, fontWeight: 700 }}>{item.condition}</span>} />
        <LabelValue label="Current Qty" value={<span style={{ fontWeight: 800, fontFamily: fonts.mono, color: isLow ? colors.danger : colors.slate900 }}>{item.qty} <span style={{ fontSize: 10, fontWeight: 400, color: colors.slate400 }}>{item.unit}</span></span>} />
        <LabelValue label="Min Qty Alert" value={item.min_qty} />
        <LabelValue label="Purchase Date" value={item.purchase_date} />
        <LabelValue label="Expiry / Warranty" value={item.expiry_date} />
        {item.category === 'Lifting & Rigging' && (
          <>
            <LabelValue label="TPI Cert No" value={item.tpi_cert_no} />
            <LabelValue label="TPI Expiry" value={<span style={{ color: isTpiExp ? colors.danger : 'inherit', fontWeight: isTpiExp ? 700 : 400 }}>{item.tpi_expiry}</span>} />
          </>
        )}
        {item.purchased_from && <LabelValue label="Purchased From" value={item.purchased_from} full />}
        <LabelValue label="Location / Site" value={item.site} full />
        <LabelValue label="Last Updated By" value={/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.updated_by || '') ? 'System / Previous' : item.updated_by} />
        <LabelValue label="Added On" value={item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'} />
      </div>

      {relatedItems.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${colors.slate100}` }}>
          <div style={{ fontSize: 9, color: colors.slate500, fontFamily: fonts.mono, letterSpacing: 1, fontWeight: 600, marginBottom: 5 }}>
            LOCATIONS & CONDITION — TOTAL: {totalQty} {item.unit}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {relatedItems.map((ri, idx) => (
              <div key={ri.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: ri.id === item.id ? colors.slate50 : 'transparent', padding: '3px 6px', borderRadius: 4, border: `1px solid ${colors.slate100}` }}>
                <span style={{ fontWeight: 600, fontSize: 11, color: ri.id === item.id ? colors.brand : colors.slate700 }}>{ri.site}</span>
                <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 11 }}>{ri.qty} {item.unit}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: (ri.condition === 'Poor' || ri.condition === 'Condemned') ? colors.danger : colors.success }}>{ri.condition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
        {isAdmin && (
          <Button onClick={() => { onClose(); onEdit(item); }} style={{ flex: 1, padding: '7px 0', fontSize: 12 }}>
            ✎ Edit
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: '7px 0', fontSize: 12 }}>
          Close
        </Button>
      </div>
    </Modal>
  );
};
