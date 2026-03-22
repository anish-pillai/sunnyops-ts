import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { colors, fonts } from '@/styles/tokens';
import type { InventoryItem } from '@/types/inventory.types';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  isAdmin: boolean;
}

export const InventoryDetailPopup: React.FC<Props> = ({ item, onClose, onEdit, isAdmin }) => {
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
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${colors.slate100}`, gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 10, color: colors.slate500, fontFamily: fonts.mono, letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, color: colors.slate900, fontWeight: 500, fontFamily: value && String(value).match(/^\d+/) ? fonts.mono : 'inherit' }}>{value || '—'}</div>
    </div>
  );

  return (
    <Modal 
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Equipment Details</span>
          <span style={{ 
            fontSize: 9, 
            background: status.bg, 
            color: status.color, 
            padding: '2px 8px', 
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
      wide
    >
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: colors.slate900, letterSpacing: -0.5 }}>{item.name}</h2>
        {item.alias && (
          <div style={{ fontSize: 12, color: colors.brand, fontFamily: fonts.mono, marginTop: 4, fontWeight: 600 }}>
            {item.alias}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 32px' }}>
        <LabelValue label="Serial / Tag No" value={item.serial_no} />
        <LabelValue label="Category" value={item.category} />
        <LabelValue label="Location / Site" value={item.site} />
        <LabelValue label="Unit" value={item.unit} />
        
        <LabelValue label="Current Quantity" value={(
          <span style={{ fontSize: 18, fontWeight: 800, color: isLow ? colors.danger : colors.slate900 }}>
            {item.qty} <span style={{ fontSize: 12, fontWeight: 400, color: colors.slate400 }}>{item.unit}</span>
          </span>
        )} />
        <LabelValue label="Min Qty Alert" value={item.min_qty} />
        
        <LabelValue label="Condition" value={(
          <span style={{ color: isCondBad ? colors.danger : colors.success, fontWeight: 700 }}>
            {item.condition}
          </span>
        )} />
        
        <LabelValue label="Purchased From" value={item.purchased_from} full />
        <LabelValue label="Purchase Date" value={item.purchase_date} />
        <LabelValue label="Expiry / Warranty" value={item.expiry_date} />

        {item.category === 'Lifting & Rigging' && (
          <>
            <LabelValue label="TPI Cert No" value={item.tpi_cert_no} />
            <LabelValue label="TPI Expiry" value={(
              <span style={{ color: isTpiExp ? colors.danger : 'inherit', fontWeight: isTpiExp ? 700 : 400 }}>
                {item.tpi_expiry}
              </span>
            )} />
          </>
        )}

        <LabelValue label="Last Updated By" value={item.updated_by} />
        <LabelValue label="Added On" value={item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
        {isAdmin && (
          <Button onClick={() => { onClose(); onEdit(item); }} style={{ flex: 1 }}>
            ✎ Edit Equipment
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} style={{ flex: isAdmin ? 1 : 1 }}>
          Close
        </Button>
      </div>
    </Modal>
  );
};
