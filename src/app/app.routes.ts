import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/roles';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'fuel-sales',
        loadComponent: () => import('./features/fuel-sales/fuel-sales').then((m) => m.FuelSales),
      },
      {
        path: 'meter-readings',
        loadComponent: () => import('./features/meter-readings/meter-readings').then((m) => m.MeterReadings),
      },
      {
        path: 'shifts',
        loadComponent: () => import('./features/shifts/shifts').then((m) => m.Shifts),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Manager] },
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'reconciliation',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Manager] },
        loadComponent: () => import('./features/reconciliation/reconciliation').then((m) => m.Reconciliation),
      },
      {
        path: 'report-builder',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () => import('./features/report-builder/report-builder').then((m) => m.ReportBuilder),
      },
      {
        path: 'activity',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Manager] },
        loadComponent: () => import('./features/activity/activity').then((m) => m.Activity),
      },
      {
        path: 'expenses',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Manager] },
        loadComponent: () => import('./features/expenses/expenses').then((m) => m.Expenses),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Manager] },
        loadComponent: () => import('./features/inventory/inventory').then((m) => m.Inventory),
      },
      {
        path: 'employees',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () => import('./features/employees/employees').then((m) => m.Employees),
      },
      {
        path: 'stations',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () => import('./features/stations/stations').then((m) => m.Stations),
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
