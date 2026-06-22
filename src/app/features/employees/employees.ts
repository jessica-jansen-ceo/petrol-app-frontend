import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, Employee } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Employees" subtitle="Operators and managers (Admin only).">
      @if (perms.canCreate('employees')) { <button class="btn-primary" (click)="openCreate()">+ Add Employee</button> }
    </app-page-header>

    <div class="toolbar">
      <input class="search" placeholder="Search name or role…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
    </div>

    <div class="panel">
      @if (filtered().length === 0) {
        <div class="empty">No employees found.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Phone</th>
            @if (perms.canModify('employees')) { <th></th> }</tr></thead>
          <tbody>
            @for (e of filtered(); track e.id) {
              <tr><td>{{ e.name }}</td><td>{{ e.role }}</td><td>{{ e.shift }}</td><td>{{ e.phone }}</td>
                @if (perms.canModify('employees')) {
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openEdit(e)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(e)">🗑</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form [title]="editing() ? 'Edit Employee' : 'Add Employee'" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Employees {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly employees = this.data.viewEmployees;
  query = signal('');
  open = signal(false);
  editing = signal<Employee | null>(null);
  fields: FormField[] = [];

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const rows = this.employees();
    return q ? rows.filter((e) => (e.name + ' ' + e.role).toLowerCase().includes(q)) : rows;
  });

  private buildFields(e?: Employee): FormField[] {
    return [
      { key: 'station', label: 'Station', type: 'select', options: this.data.stationNames(), value: e ? this.data.stationName(e.stationId) : this.data.defaultStationName() },
      { key: 'name', label: 'Full Name', type: 'text', required: true, value: e?.name ?? '' },
      { key: 'role', label: 'Role', type: 'select', options: ['Pump Operator', 'Manager', 'Admin'], value: e?.role },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Night', 'Day'], value: e?.shift },
      { key: 'phone', label: 'Phone', type: 'text', value: e?.phone ?? '' },
    ];
  }

  openCreate() { this.editing.set(null); this.fields = this.buildFields(); this.open.set(true); }
  openEdit(e: Employee) { this.editing.set(e); this.fields = this.buildFields(e); this.open.set(true); }

  save(v: Record<string, string>) {
    const rec = { stationId: this.data.stationIdByName(v['station']), name: v['name'], role: v['role'], shift: v['shift'], phone: v['phone'] || '—' };
    const cur = this.editing();
    if (cur) { this.data.update<Employee>('employees', cur.id, rec); this.toast.show('Employee updated'); }
    else { this.data.add<Employee>('employees', rec); this.data.log(`Added employee ${rec.name}`); this.toast.show('Employee added'); }
    this.open.set(false);
  }

  async del(e: Employee) {
    if (await this.confirm.ask(`Remove ${e.name}?`)) {
      this.data.remove('employees', e.id);
      this.toast.show('Employee removed', 'info');
    }
  }
}
