import React, { useState, useEffect } from 'react';
import { useProcurement } from '@/hooks/useProcurement';
import { useAuth } from '@/hooks/useAuth';
import { PurchaseOrdersSubTab } from './components/PurchaseOrdersSubTab';
import { QuotationsSubTab } from './components/QuotationsSubTab';

export const ProcurementTab: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'director' || userRole === 'managing-director';
  const { pos, quotations, loading, fetchAll, savePO, saveQuotation } = useProcurement();
  const [activeTab, setActiveTab] = useState<'po' | 'quotations'>('po');

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabStyle = (tab: 'po' | 'quotations'): React.CSSProperties => ({
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    borderBottom: `3px solid ${activeTab === tab ? '#7c3aed' : 'transparent'}`,
    color: activeTab === tab ? '#7c3aed' : '#64748b',
    fontFamily: 'IBM Plex Mono, monospace',
    transition: 'all 0.2s',
    background: 'none',
    border: 'none',
    outline: 'none'
  });

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <button style={tabStyle('po')} onClick={() => setActiveTab('po')}>
          Purchase Orders
        </button>
        <button style={tabStyle('quotations')} onClick={() => setActiveTab('quotations')}>
          Quotations
        </button>
      </div>

      <div>
        {activeTab === 'po' ? (
          <PurchaseOrdersSubTab 
            pos={pos} 
            loading={loading} 
            isAdmin={isAdmin} 
            onSave={savePO} 
          />
        ) : (
          <QuotationsSubTab 
            quotations={quotations} 
            loading={loading} 
            isAdmin={isAdmin} 
            onSave={saveQuotation} 
          />
        )}
      </div>
    </div>
  );
};
