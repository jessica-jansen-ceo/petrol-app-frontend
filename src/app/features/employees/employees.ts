import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Employees" subtitle="Operators and managers (Admin only).">
      <button class="btn-primary">+ Add Employee</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Phone</th></tr></thead>
        <tbody>
          @for (e of employees; track $index) {
            <tr><td>{{ e.name }}</td><td>{{ e.role }}</td><td>{{ e.shift }}</td><td>{{ e.phone }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Employees {
  readonly employees = inject(MockDataService).employees();
}
