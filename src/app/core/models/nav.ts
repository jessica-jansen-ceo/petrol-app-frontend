import { UserRole } from './roles';

/** A single sidebar navigation entry, gated by role and optional feature flag. */
export interface NavItem {
  label: string;
  /** Router path (relative to the shell). */
  path: string;
  /** Simple inline-SVG icon name -> resolved in the sidebar component. */
  icon: string;
  /** Roles allowed to see/use this entry. */
  roles: UserRole[];
  /** Optional white-label feature flag key; hidden when the flag is false. */
  feature?: 'reports' | 'expenses' | 'inventory' | 'employees' | 'shifts';
}

const A = UserRole.Admin;
const M = UserRole.Manager;
const O = UserRole.Operator;

/** Master nav definition. The sidebar filters this by role + feature flags. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'grid', roles: [A, M, O] },
  { label: 'Fuel Sales', path: 'fuel-sales', icon: 'fuel', roles: [A, M, O] },
  { label: 'Meter Readings', path: 'meter-readings', icon: 'gauge', roles: [A, M, O] },
  { label: 'Shifts', path: 'shifts', icon: 'clock', roles: [A, M, O], feature: 'shifts' },
  { label: 'Reports', path: 'reports', icon: 'chart', roles: [A, M], feature: 'reports' },
  { label: 'Reconciliation', path: 'reconciliation', icon: 'scale', roles: [A, M] },
  { label: 'Expenses', path: 'expenses', icon: 'receipt', roles: [A, M], feature: 'expenses' },
  { label: 'Inventory', path: 'inventory', icon: 'tank', roles: [A, M], feature: 'inventory' },
  { label: 'Employees', path: 'employees', icon: 'users', roles: [A], feature: 'employees' },
  { label: 'Activity Log', path: 'activity', icon: 'list', roles: [A, M] },
  { label: 'Settings', path: 'settings', icon: 'cog', roles: [A] },
];
