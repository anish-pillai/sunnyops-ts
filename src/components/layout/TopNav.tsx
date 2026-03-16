import React from 'react';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

interface TopNavProps {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ tabs, activeTab, onTabChange }) => (
  <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 2, padding: '8px 20px', background: '#f1f5f9' }}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className="mono"
          style={{
            padding: '7px 14px',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === key ? '#f97316' : 'transparent',
            color: activeTab === key ? '#fff' : '#64748b',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);
