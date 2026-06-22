import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from '../models/roles';
import { Shift } from './mock-data.service';

/** Resources whose create/edit/delete are gated by role. */
export type Resource = 'sales' | 'meters' | 'expenses' | 'inventory' | 'employees' | 'prices' | 'fuelTypes' | 'backup' | 'stations';

/**
 * Action-level access rules (the route guards handle screen visibility; this
 * handles what you can DO once you're on a screen).
 *
 *  - Operator: create sales & meter readings; clock own shift only.
 *  - Manager : full CRUD on operational data; view reports & reconciliation.
 *  - Admin   : everything, incl. employees, prices, fuel types, backup.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private auth = inject(AuthService);

  private role(): UserRole | null { return this.auth.role(); }

  canCreate(resource: Resource): boolean {
    const r = this.role();
    if (r === UserRole.Admin) return true;
    if (r === UserRole.Manager) return resource !== 'employees' && resource !== 'prices' && resource !== 'fuelTypes' && resource !== 'backup' && resource !== 'stations';
    // Operator
    return resource === 'sales' || resource === 'meters';
  }

  /** Edit/delete is for supervisors only (operators are create-only). */
  canModify(resource: Resource): boolean {
    const r = this.role();
    if (r === UserRole.Admin) return true;
    if (r === UserRole.Manager) return resource !== 'employees' && resource !== 'prices' && resource !== 'fuelTypes' && resource !== 'backup' && resource !== 'stations';
    return false;
  }

  /** Can the current user start/stop THIS shift's time? */
  canManageShift(shift: Shift): boolean {
    const r = this.role();
    if (r === UserRole.Admin || r === UserRole.Manager) return true;
    // Operators may only clock their own shift.
    return shift.operator === this.auth.user()?.displayName;
  }

  /** Operators may only open their own shift; supervisors anyone's. */
  isSupervisor(): boolean {
    const r = this.role();
    return r === UserRole.Admin || r === UserRole.Manager;
  }
}
