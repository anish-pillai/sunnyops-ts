import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/hooks/useSettings';
import { UserManagementTab } from './components/UserManagementTab';
import { SiteManagementTab } from './components/SiteManagementTab';
import { RolePermissionsTab } from './components/RolePermissionsTab';

type View = 'users' | 'sites' | 'permissions' | 'biometric';

export const SettingsTab: React.FC = () => {
  const [view, setView] = useState<View>('biometric');
  const { 
    loading, siteDetails, rolePerms, users, 
    fetchSiteDetails, fetchRolePermissions, fetchUsers, 
    saveSiteDetails, saveRolePermissions, updateUserProfile 
  } = useSettings();

  useEffect(() => {
    fetchSiteDetails();
    fetchRolePermissions();
  }, [fetchSiteDetails, fetchRolePermissions]);

  const tabs: { key: View; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'sites', label: 'Sites' },
    { key: 'permissions', label: 'Permissions' },
    { key: 'biometric', label: '🔐 Biometric' },
  ];

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: view === t.key ? '#f97316' : 'transparent', color: view === t.key ? '#fff' : '#64748b', fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'users' && (
        <UserManagementTab 
          users={users} 
          loading={loading} 
          onRefresh={fetchUsers} 
          onUpdate={updateUserProfile} 
          sites={siteDetails}
        />
      )}

      {view === 'sites' && (
        <SiteManagementTab 
          sites={siteDetails} 
          onSave={saveSiteDetails} 
          loading={loading} 
        />
      )}

      {view === 'permissions' && (
        <RolePermissionsTab 
          rolePerms={rolePerms} 
          onSave={saveRolePermissions} 
          loading={loading} 
        />
      )}

      {view === 'biometric' && (
        <BiometricSettingsPanel />
      )}
    </div>
  );
};

const BiometricSettingsPanel: React.FC = () => {
  const [status, setStatus] = useState('');
  const stored = localStorage.getItem('sunny_biometric_cred');
  const supported = !!(window.PublicKeyCredential && navigator.credentials?.create);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px 28px', maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 40 }}>🔐</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Biometric Login</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Use fingerprint or Face ID instead of password</div>
        </div>
      </div>
      <div style={{ background: stored ? '#f0fdf4' : '#f8fafc', border: `1px solid ${stored ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>{stored ? '✅' : '⚪'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: stored ? '#16a34a' : '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{stored ? 'ENABLED ON THIS DEVICE' : 'NOT SET UP'}</div>
          {stored && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Registered for this device</div>}
        </div>
      </div>
      {!supported && <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>⚠️ Biometric not supported on this browser. Use Chrome (Android) or Safari (iPhone) with the installed PWA.</div>}
      {status && <div style={{ background: status.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${status.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: status.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{status}</div>}
      {!stored ? (
        <Button style={{ width: '100%', padding: '12px 0' }} onClick={() => setStatus('Use Settings → 🔐 Biometric in the main app to enable biometric, or sign in with password to get the setup prompt.')}>
          Enable Biometric on This Device
        </Button>
      ) : (
        <Button variant="danger" style={{ width: '100%', padding: '11px 0' }} onClick={() => { localStorage.removeItem('sunny_biometric_cred'); localStorage.removeItem('sunny_bio_session_cache'); setStatus('Biometric removed from this device.'); }}>
          🗑 Remove Biometric from This Device
        </Button>
      )}
      <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
        • Biometric is stored on this device only — never sent to server<br />
        • Each phone/laptop needs to be set up separately<br />
        • Works with fingerprint, Face ID, or Windows Hello
      </div>
    </div>
  );
};
