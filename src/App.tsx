import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { AuthScreen } from '@/modules/auth/AuthScreen';
import { TopNav } from '@/components/layout/TopNav';
import type { TabDef } from '@/components/layout/TopNav';
import { Toast, Spinner } from '@/components/ui';
import { ADMIN_EMAIL } from '@/config/constants';
import { hasPerm } from '@/config/roles';

const DashboardTab   = React.lazy(() => import('@/modules/dashboard/DashboardTab').then(m => ({ default: m.DashboardTab })));
const InventoryTab   = React.lazy(() => import('@/modules/inventory/InventoryTab').then(m => ({ default: m.InventoryTab })));
const StoreTab       = React.lazy(() => import('@/modules/store/StoreTab').then(m => ({ default: m.StoreTab })));
const BillsTab       = React.lazy(() => import('@/modules/bills/BillsTab').then(m => ({ default: m.BillsTab })));
const HRTab          = React.lazy(() => import('@/modules/hr/HRTab').then(m => ({ default: m.HRTab })));
const SettingsTab    = React.lazy(() => import('@/modules/settings/SettingsTab').then(m => ({ default: m.SettingsTab })));
const PayablesTab    = React.lazy(() => import('@/modules/payables/PayablesTab').then(m => ({ default: m.PayablesTab })));
const ChallansTab    = React.lazy(() => import('@/modules/challans/ChallansTab').then(m => ({ default: m.ChallansTab })));
const SiteRequestsTab = React.lazy(() => import('@/modules/requests/SiteRequestsTab').then(m => ({ default: m.SiteRequestsTab })));
const ProcurementTab = React.lazy(() => import('@/modules/procurement/ProcurementTab').then(m => ({ default: m.ProcurementTab })));
const LogsTab        = React.lazy(() => import('@/modules/logs/LogsTab').then(m => ({ default: m.LogsTab })));
const ActivityTab    = React.lazy(() => import('@/modules/activity/ActivityTab').then(m => ({ default: m.ActivityTab })));

interface ToastState { msg: string; type?: 'ok' | 'err' }

export const App: React.FC = () => {
  const auth = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = auth.user?.email === ADMIN_EMAIL || auth.userRole === 'admin';
  const isMD    = auth.userRole === 'managing-director';

  const getPerm = useCallback((perm: string): boolean => {
    if (isAdmin) return true;
    return hasPerm(auth.userRole, perm as Parameters<typeof hasPerm>[1], auth.rolePerms);
  }, [isAdmin, auth.rolePerms, auth.userRole]);

  const showToast = useCallback((msg: string, type?: 'ok' | 'err') => {
    setToast({ msg, type });
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  useRealtime(['bills', 'payables', 'site_requests', 'challans', 'store_items'], refresh);

  const TABS: TabDef[] = [];
  if (isAdmin || getPerm('dashboard'))    TABS.push({ key: 'dashboard',   label: 'Dashboard',  icon: '📊' });
  if (isAdmin || getPerm('inventory'))    TABS.push({ key: 'inventory',   label: 'Inventory',  icon: '📦' });
  if (isAdmin || getPerm('store'))        TABS.push({ key: 'store',       label: 'Store',      icon: '🏪' });
  if (isAdmin || getPerm('challans'))     TABS.push({ key: 'challans',    label: 'Challans',   icon: '📄' });
  if (isAdmin || getPerm('bills'))        TABS.push({ key: 'bills',       label: 'Bills',      icon: '📋' });
  if (isAdmin || getPerm('payables'))     TABS.push({ key: 'payables',    label: 'Payables',   icon: '💸' });
  if (isAdmin || getPerm('requests'))     TABS.push({ key: 'requests',    label: 'Requests',   icon: '🔄' });
  if (isAdmin || getPerm('logs'))         TABS.push({ key: 'logs',        label: 'Stock Logs', icon: '📋' });
  if (isAdmin)                            TABS.push({ key: 'activity',    label: 'Activity',   icon: '👥' });
  if (isAdmin || getPerm('procurement'))  TABS.push({ key: 'procurement', label: 'Procure',    icon: '🛒' });
  if (isAdmin || getPerm('hr_letters'))   TABS.push({ key: 'hr',          label: 'HR',         icon: '👥' });
  if (isAdmin)                            TABS.push({ key: 'settings',    label: 'Settings',   icon: '⚙️' });

  if (auth.loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  }

  if (!auth.user) {
    return <AuthScreen onSignIn={auth.signIn} onBiometricSignIn={auth.biometricSignIn} />;
  }

  const assignedSites = (isMD || auth.userRole === 'store-manager') ? auth.assignedSites : undefined;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 16, color: '#f97316' }}>SUNNY OPS</div>
          <div style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 2, fontFamily: 'IBM Plex Mono, monospace' }}>OPERATIONS & FINANCE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: isMD ? '#4338ca' : '#f97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>
            {auth.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{auth.userName}</div>
            {isMD && auth.assignedSites.length > 0 && (
              <span style={{ background: '#3730a3', color: '#c7d2fe', borderRadius: 4, padding: '1px 7px', fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                MD — {auth.assignedSites.join(', ')}
              </span>
            )}
          </div>
          <button onClick={auth.signOut} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '5px 12px', fontSize: 10, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, letterSpacing: 1 }}>Sign Out</button>
        </div>
      </div>
      
      {/* Top nav */}
      <TopNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px' }}>
        <React.Suspense fallback={<Spinner />}>
          {tab === 'dashboard'   && <DashboardTab   key={refreshKey} assignedSites={assignedSites} isDirector={auth.userRole === 'director' || isMD} isAdmin={isAdmin} uName={auth.userName} userRole={auth.userRole} getPerm={getPerm} showToast={showToast} />}
          {tab === 'inventory'   && <InventoryTab   key={refreshKey} isAdmin={isAdmin} uName={auth.userName} showToast={showToast} />}
          {tab === 'store'       && <StoreTab       key={refreshKey} isAdmin={isAdmin} uName={auth.userName} assignedSites={assignedSites} showToast={showToast} />}
          {tab === 'bills'       && <BillsTab       key={refreshKey} isAdmin={isAdmin} uName={auth.userName} userRole={auth.userRole} assignedSites={assignedSites} showToast={showToast} />}
          {tab === 'payables'    && <PayablesTab />}
          {tab === 'challans'    && <ChallansTab isAdmin={isAdmin} showToast={showToast} />}
          {tab === 'requests'    && <SiteRequestsTab />}
          {tab === 'logs'        && <LogsTab />}
          {tab === 'activity'    && <ActivityTab />}
          {tab === 'procurement' && <ProcurementTab />}
          {tab === 'hr'          && <HRTab          key={refreshKey} isAdmin={isAdmin} uName={auth.userName} userRole={auth.userRole} showToast={showToast} />}
          {tab === 'settings'    && isAdmin && <SettingsTab key={refreshKey} />}
        </React.Suspense>
      </div>



      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
