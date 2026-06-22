import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Employees" subtitle="Operators and managers (Admin only).">
      <button class="btn-primary" (click)="open.set(true)">+ Add Employee</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Phone</th></tr></thead>
        <tbody>
          @for (e of employees(); track $index) {
            <tr><td>{{ e.name }}</td><td>{{ e.role }}</td><td>{{ e.shift }}</td><td>{{ e.phone }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal-form title="Add Employee" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Employees {
  private data = inject(MockDataService);
  readonly employees = this.data.employees();
  open = signal(false);

  fields: FormField[] = [
    { key: 'name', label: 'Full Name', type: 'text', value: '' },
    { key: 'role', label: 'Role', type: 'select', options: ['Pump Operator', 'Manager', 'Admin'] },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Night', 'Day'] },
    { key: 'phone', label: 'Phone', type: 'text', value: '' },
  ];

  save(v: Record<string, string>) {
    this.data.addEmployee({
      name: v['name'] || 'New Employee',
      role: v['role'],
      shift: v['shift'],
      phone: v['phone'] || '—',
    });
    this.open.set(false);
  }
}
