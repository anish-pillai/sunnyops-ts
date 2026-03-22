import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { colors, fonts } from '@/styles/tokens';
import type { InventoryItem } from '@/types/inventory.types';

interface Props {
  title: string;
  items: InventoryItem[];
  type: 'low_stock' | 'tpi_expiring';
  onClose: () => void;
  onItemClick: (item: InventoryItem) => void;
}

export const InventoryListPopup: React.FC<Props> = ({ title, items, type, onClose, onItemClick }) => {
  return (
    <Modal title={title} onClose={onClose} wide>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <DataTable<InventoryItem>
          columns={[
            { header: 'Equipment', render: (item) => (
              <div style={{ fontWeight: 600, color: colors.slate900 }}>{item.name}</div>
            )},
            { header: 'Location', render: (item) => (
              <span style={{ 
                background: '#fff7ed', 
                color: '#ea580c', 
                padding: '2px 8px', 
                borderRadius: 12, 
                fontSize: 10, 
                fontFamily: fonts.mono,
                fontWeight: 700
              }}>
                {item.site}
              </span>
            )},
            { header: 'Qty', align: 'right', render: (item) => (
              <div style={{ fontFamily: fonts.mono, fontWeight: 700 }}>
                <span style={{ color: item.qty <= item.min_qty ? colors.danger : colors.slate900 }}>{item.qty}</span>
                <span style={{ fontSize: 9, color: colors.slate400, marginLeft: 4 }}>{item.unit}</span>
              </div>
            )},
            { 
              header: type === 'low_stock' ? 'Min Qty' : 'TPI Expiry', 
              align: 'right',
              render: (item) => (
                <span style={{ 
                  fontFamily: fonts.mono, 
                  fontSize: 11,
                  color: type === 'tpi_expiring' && item.tpi_expiry && new Date(item.tpi_expiry) < new Date() ? colors.danger : colors.slate600,
                  fontWeight: type === 'tpi_expiring' ? 700 : 400
                }}>
                  {type === 'low_stock' ? item.min_qty : (item.tpi_expiry || '—')}
                </span>
              )
            }
          ]}
          data={items}
          onRowClick={onItemClick}
          emptyMessage="No items found"
          initialPageSize={10}
        />
      </div>
    </Modal>
  );
};
