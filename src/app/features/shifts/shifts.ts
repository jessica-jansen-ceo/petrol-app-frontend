import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Shifts" subtitle="Operator shift schedule and status.">
      <button class="btn-primary" (click)="open.set(true)">+ Open Shift</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Operator</th><th>Start</th><th>End</th><th>Pump</th><th>Status</th></tr></thead>
        <tbody>
          @for (s of shifts(); track $index) {
            <tr><td>{{ s.operator }}</td><td>{{ s.start }}</td><td>{{ s.end }}</td><td>{{ s.pump }}</td>
              <td><span class="badge" [class.active]="s.status === 'Active'">{{ s.status }}</span></td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal-form title="Open Shift" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Shifts {
  private data = inject(MockDataService);
  readonly shifts = this.data.shifts();
  open = signal(false);

  fields: FormField[] = [
    { key: 'operator', label: 'Operator', type: 'text', value: '' },
    { key: 'start', label: 'Start Time', type: 'text', value: '06:00' },
    { key: 'end', label: 'End Time', type: 'text', value: '14:00' },
    { key: 'pump', label: 'Pump', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4', 'Office'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed'] },
  ];

  save(v: Record<string, string>) {
    this.data.addShift({
      operator: v['operator'] || 'Unknown',
      start: v['start'],
      end: v['end'],
      pump: v['pump'],
      status: v['status'] === 'Closed' ? 'Closed' : 'Active',
    });
    this.open.set(false);
  }
}
