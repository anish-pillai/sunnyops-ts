import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { UserProfile, UserRole } from '@/types/user.types';
import type { SiteDetail } from '@/config/constants';

interface Props {
  users: UserProfile[];
  loading: boolean;
  onRefresh: (svcKey?: string) => Promise<void>;
  onUpdate: (profile: Partial<UserProfile>, svcKey?: string) => Promise<void>;
  sites: SiteDetail[];
}

const ROLES: UserRole[] = ["admin", "director", "managing-director", "fin-manager", "accounts", "inv-manager", "planning_dept", "supervisor", "store-manager", "staff"];

export const UserManagementTab: React.FC<Props> = ({ users, loading, onRefresh, onUpdate, sites }) => {
  const [svcKey, setSvcKey] = useState(() => localStorage.getItem('sunny_svc_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    onRefresh(svcKey);
  }, []);

  const handleApplyKey = () => {
    localStorage.setItem('sunny_svc_key', svcKey);
    onRefresh(svcKey);
    setShowKeyInput(false);
  };

  const handleUpdate = async (profile: Partial<UserProfile>) => {
    try {
      await onUpdate(profile, svcKey);
      setEditUser(null);
    } catch (err) {
      alert('Error updating user');
    }
  };

  const toggleSite = (user: UserProfile, siteName: string) => {
    const current = user.assigned_sites || [];
    const next = current.includes(siteName) 
      ? current.filter(s => s !== siteName) 
      : [...current, siteName];
    handleUpdate({ id: user.id, assigned_sites: next });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>User Management</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setShowKeyInput(!showKeyInput)}>🔑 {svcKey ? 'Change' : 'Set'} Admin Key</Button>
          <Button variant="ghost" onClick={() => onRefresh(svcKey)}>🔄 Refresh</Button>
        </div>
      </div>

      {showKeyInput && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Enter Supabase <b>service_role</b> key to enable user administration (roles & site assignments).</div>
          <input 
            type="password" 
            value={svcKey} 
            onChange={e => setSvcKey(e.target.value)} 
            placeholder="Paste service_role key here..." 
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 10 }} 
          />
          <Button onClick={handleApplyKey}>Apply and Refresh</Button>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              {editUser?.id === u.id ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>{u.full_name} ({u.email})</div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>ASSIGN ROLE</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ROLES.map(r => (
                        <button 
                          key={r} 
                          onClick={() => handleUpdate({ id: u.id, role: r })}
                          style={{ 
                            fontSize: 10, padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0',
                            background: u.role === r ? '#0f172a' : '#fff', color: u.role === r ? '#fff' : '#64748b',
                            cursor: 'pointer' 
                          }}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>ASSIGNED SITES (Store Manager only)</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sites.map(s => (
                        <button 
                          key={s.name} 
                          onClick={() => toggleSite(u, s.name)}
                          style={{ 
                            fontSize: 10, padding: '4px 10px', borderRadius: 20, border: '1px solid #e2e8f0',
                            background: u.assigned_sites?.includes(s.name) ? '#f97316' : '#fff', 
                            color: u.assigned_sites?.includes(s.name) ? '#fff' : '#64748b',
                            cursor: 'pointer' 
                          }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => setEditUser(null)} style={{ marginTop: 16 }}>Close</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{u.full_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{u.email} • <b>{u.role?.toUpperCase()}</b></div>
                    {u.assigned_sites && u.assigned_sites.length > 0 && (
                      <div style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>Sites: {u.assigned_sites.join(', ')}</div>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => setEditUser(u)} style={{ fontSize: 10 }}>Edit</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
