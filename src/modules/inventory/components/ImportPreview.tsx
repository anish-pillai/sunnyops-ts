import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ParsedImport {
  newItems: any[];
  updatedItems: any[];
  errors: any[];
}

interface Props {
  parsed: ParsedImport;
  onConfirm: () => void;
  onClose: () => void;
  saving?: boolean;
}

export const ImportPreview: React.FC<Props> = ({ parsed, onConfirm, onClose, saving }) => {
  const { newItems, updatedItems, errors } = parsed;
  const [showAll, setShowAll] = useState(false);

  const previewNew = showAll ? newItems : newItems.slice(0, 5);
  const previewUpd = showAll ? updatedItems : updatedItems.slice(0, 5);

  const totalRows = newItems.length + updatedItems.length;

  return (
    <Modal title="Import Preview" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          ['🟢 New Items', newItems.length, '#16a34a', '#f0fdf4', '#bbf7d0'],
          ['🟡 Qty Updates', updatedItems.length, '#f97316', '#fff7ed', '#fed7aa'],
          ['🔴 Errors', errors.length, '#dc2626', '#fef2f2', '#fecaca']
        ].map(([l, v, col, bg, br]) => (
          <div key={l as string} style={{ background: bg as string, border: `1px solid ${br}`, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: col as string, fontFamily: 'IBM Plex Mono, monospace' }}>{v}</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px', marginBottom: 12, fontSize: 12, color: '#dc2626', maxHeight: 80, overflowY: 'auto' }}>
          {errors.map((e, i) => (
            <div key={i}>Row {e.row}: {e.reason}</div>
          ))}
        </div>
      )}

      {updatedItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', marginBottom: 6, letterSpacing: 1 }}>QTY UPDATES</div>
          <div style={{ border: '1px solid #fed7aa', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fff7ed' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#92400e' }}>Equipment</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#92400e' }}>Site</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#92400e' }}>Old</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#92400e' }}>Import</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#16a34a' }}>New</th>
                </tr>
              </thead>
              <tbody>
                {previewUpd.map((u, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #fed7aa' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{u.site}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>{u.oldQty}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#f97316', fontWeight: 700 }}>+{u.qty}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{u.newQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {newItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6, letterSpacing: 1 }}>NEW ITEMS</div>
          <div style={{ border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f0fdf4' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#166534' }}>Equipment</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#166534' }}>Site</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#166534' }}>Category</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#166534' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {previewNew.map((n, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #bbf7d0' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{n.name}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{n.site}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{n.category}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{n.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(newItems.length > 5 || updatedItems.length > 5) && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button 
            onClick={() => setShowAll(p => !p)} 
            style={{ background: 'none', border: 'none', color: '#f97316', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showAll ? 'Show less' : `Show all ${totalRows} rows`}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <Button onClick={onConfirm} disabled={saving || totalRows === 0} style={{ flex: 1, padding: '11px 0' }} loading={saving}>
          {saving ? 'Importing...' : 'Confirm Import'}
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
