import React from 'react';

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, onClose, wide = false, children, headerActions }) => (
  <div
    onClick={e => e.target === e.currentTarget && onClose()}
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.5)',
      zIndex: 500,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 16px',
      overflowY: 'auto',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        width: '100%',
        maxWidth: wide ? 900 : 500,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{title}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {headerActions}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
          >×</button>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  </div>
);
