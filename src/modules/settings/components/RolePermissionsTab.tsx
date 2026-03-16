import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { AllRolePermissions, PermissionKey, UserRole } from '@/types/user.types';

interface Props {
  rolePerms: AllRolePermissions;
  onSave: (perms: AllRolePermissions) => Promise<void>;
  loading: boolean;
}

const ROLES: UserRole[] = ["staff", "supervisor", "inv-manager", "fin-manager", "accounts", "director", "planning_dept", "store-manager"];

const PERMS: { key: PermissionKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "inventory", label: "Inventory (Equipment)", icon: "📦" },
  { key: "store", label: "Store / Stock", icon: "🏪" },
  { key: "challans", label: "Challans", icon: "📄" },
  { key: "bills", label: "Bills & Invoices", icon: "📋" },
  { key: "payables", label: "Payables", icon: "💸" },
  { key: "requests", label: "Site Requests", icon: "📬" },
  { key: "logs", label: "Stock Logs", icon: "📋" },
  { key: "procurement", label: "Procurement (PO & Quotations)", icon: "🛒" },
  { key: "hr_letters", label: "HR & Letters", icon: "👥" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

export const RolePermissionsTab: React.FC<Props> = ({ rolePerms, onSave, loading }) => {
  const [localPerms, setLocalPerms] = useState<AllRolePermissions>(JSON.parse(JSON.stringify(rolePerms)));
  const [saved, setSaved] = useState(false);

  const toggle = (role: UserRole, perm: PermissionKey) => {
    setLocalPerms(prev => {
      const n = JSON.parse(JSON.stringify(prev)) as AllRolePermissions;
      if (!n[role]) n[role] = {} as any;
      (n[role] as any)[perm] = !(n[role] as any)[perm];
      return n;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    await onSave(localPerms);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#f97316', letterSpacing: 2 }}>ROLE PERMISSIONS</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Admin always has full access. Toggle access per role below.</div>
        </div>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : saved ? '✅ Saved' : 'Save Changes'}</Button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontWeight: 700, whiteSpace: 'nowrap' }}>FEATURE</th>
              {ROLES.map(r => <th key={r} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontWeight: 700 }}>{r.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMS.map((p, pi) => (
              <tr key={p.key} style={{ borderTop: '1px solid #f1f5f9', background: pi % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                  <span style={{ marginRight: 8 }}>{p.icon}</span>
                  {p.label}
                </td>
                {ROLES.map(r => {
                  const checked = !!(localPerms[r] && (localPerms[r] as any)[p.key]);
                  const isLocked = r === "accounts" && (p.key === "bills" || p.key === "payables");
                  return (
                    <td key={r} style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {isLocked ? (
                        <span title="Accounts always has bills access">🔒</span>
                      ) : (
                        <div 
                          onClick={() => toggle(r, p.key)} 
                          style={{ 
                            width: 36, height: 20, borderRadius: 10, background: checked ? '#f97316' : '#e2e8f0', 
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s' 
                          }}
                        >
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
