import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Shifts" subtitle="Operator shift schedule and status.">
      <button class="btn-primary">+ Open Shift</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Operator</th><th>Start</th><th>End</th><th>Pump</th><th>Status</th></tr></thead>
        <tbody>
          @for (s of shifts; track $index) {
            <tr><td>{{ s.operator }}</td><td>{{ s.start }}</td><td>{{ s.end }}</td><td>{{ s.pump }}</td>
              <td><span class="badge" [class.active]="s.status === 'Active'">{{ s.status }}</span></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Shifts {
  readonly shifts = inject(MockDataService).shifts();
}
