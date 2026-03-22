import type { UserRole, PermissionKey, RolePermissions, AllRolePermissions } from '@/types/user.types';
import { colors } from '@/styles/tokens';

export const ALL_ROLES: UserRole[] = [
  'staff', 'supervisor', 'inv-manager', 'fin-manager',
  'accounts', 'managing-director', 'director', 'planning_dept',
  'store-manager', 'admin',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  staff:               'Staff',
  supervisor:          'Supervisor',
  'inv-manager':       'Inv. Manager (Ops)',
  'fin-manager':       'Finance Manager',
  accounts:            'Accounts (Bills Access)',
  'managing-director': 'Managing Director (Site Executive)',
  director:            'Director (Full Executive — All Sites)',
  planning_dept:       'Planning Department',
  'store-manager':     'Store Manager (Site-Restricted)',
  admin:               'Admin (User Management)',
};

export const ROLE_BADGE: Record<UserRole, { bg: string; br: string; c: string; label: string }> = {
  admin:               { bg: colors.brandLight,   br: colors.brandBorder,    c: colors.brandHover,  label: 'ADMIN' },
  director:            { bg: colors.violetBgAlt,  br: colors.violetBorderAlt, c: colors.violet,     label: 'DIRECTOR' },
  'managing-director': { bg: colors.indigoBg,     br: colors.indigoBorder,   c: colors.indigo,      label: 'MANAGING DIR' },
  'fin-manager':       { bg: colors.infoBg,       br: colors.infoBorder,     c: colors.info,        label: 'FIN.MGR' },
  'inv-manager':       { bg: colors.successBg,    br: colors.successBorder,  c: colors.successDark, label: 'INV.MGR' },
  planning_dept:       { bg: colors.successBg,    br: colors.successBorderMd, c: colors.success,    label: 'PLANNING' },
  accounts:            { bg: colors.warningBgLight, br: colors.warningBorderSm, c: colors.warning,  label: 'ACCOUNTS' },
  supervisor:          { bg: colors.infoLight,    br: colors.infoBorderLight, c: colors.infoDark,    label: 'SUPERVISOR' },
  'store-manager':     { bg: colors.brandLight,   br: colors.brandBorder,    c: colors.brandHover,  label: 'STORE MGR' },
  staff:               { bg: colors.slate50,      br: colors.border,         c: colors.textSecondary, label: 'STAFF' },
};

export const SITE_RESTRICTED_ROLES: UserRole[] = ['store-manager', 'managing-director'];

export const DEFAULT_PERMISSIONS: AllRolePermissions = {
  staff:               { dashboard: false, inventory: false, store: false, challans: false, bills: false, payables: false, requests: false, logs: false, procurement: false, hr_letters: true,  settings: false },
  supervisor:          { dashboard: true,  inventory: true,  store: true,  challans: true,  bills: false, payables: false, requests: true,  logs: true,  procurement: false, hr_letters: false, settings: false },
  'inv-manager':       { dashboard: true,  inventory: true,  store: true,  challans: true,  bills: false, payables: false, requests: true,  logs: true,  procurement: false, hr_letters: false, settings: false },
  'fin-manager':       { dashboard: true,  inventory: false, store: false, challans: false, bills: true,  payables: true,  requests: false, logs: false, procurement: true,  hr_letters: false, settings: false },
  accounts:            { dashboard: true,  inventory: false, store: false, challans: true,  bills: true,  payables: true,  requests: true,  logs: false, procurement: true,  hr_letters: false, settings: false },
  'managing-director': { dashboard: true,  inventory: true,  store: true,  challans: true,  bills: true,  payables: true,  requests: true,  logs: true,  procurement: true,  hr_letters: true,  settings: false },
  director:            { dashboard: true,  inventory: true,  store: true,  challans: true,  bills: true,  payables: true,  requests: true,  logs: true,  procurement: true,  hr_letters: true,  settings: false },
  planning_dept:       { dashboard: true,  inventory: true,  store: false, challans: false, bills: false, payables: false, requests: true,  logs: false, procurement: true,  hr_letters: false, settings: false },
  'store-manager':     { dashboard: true,  inventory: false, store: true,  challans: true,  bills: false, payables: false, requests: true,  logs: true,  procurement: false, hr_letters: false, settings: false },
  admin:               { dashboard: true,  inventory: true,  store: true,  challans: true,  bills: true,  payables: true,  requests: true,  logs: true,  procurement: true,  hr_letters: true,  settings: true  },
};

export function getPermissions(role: UserRole, overrides: AllRolePermissions = {}): RolePermissions {
  const defaults = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.staff!;
  const override = overrides[role];
  if (!override) return { ...defaults };
  // OR-merge: defaults always win, DB can only add more access, never block
  const merged = { ...defaults } as RolePermissions;
  for (const key of Object.keys(override) as Array<keyof RolePermissions>) {
    if (override[key] === true) merged[key] = true;
  }
  return merged;
}

export function hasPerm(role: UserRole, perm: PermissionKey, overrides: AllRolePermissions = {}): boolean {
  if (role === 'admin') return true;
  return getPermissions(role, overrides)[perm] ?? false;
}
