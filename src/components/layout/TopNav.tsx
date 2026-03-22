import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '@/styles/tokens';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

interface TopNavProps {
  tabs: TabDef[];
}

export const TopNav: React.FC<TopNavProps> = ({ tabs }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the active tab key from the current path (e.g. "/bills" -> "bills")
  const activeTab = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 2, padding: '8px 20px' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => navigate(`/${key}`)}
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
              background: activeTab === key ? colors.brand : 'transparent',
              color: activeTab === key ? colors.surface : colors.textSecondary,
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
};
