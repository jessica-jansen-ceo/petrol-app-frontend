import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [PageHeader, DatePipe],
  template: `
    <app-page-header title="Activity Log" subtitle="Recent actions across the system (most recent first)."></app-page-header>
    <div class="panel">
      @if (entries().length === 0) {
        <div class="empty">No activity yet.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>When</th><th>User</th><th>Action</th></tr></thead>
          <tbody>
            @for (a of entries(); track a.id) {
              <tr><td>{{ a.time | date: 'short' }}</td><td>{{ a.user }}</td><td>{{ a.action }}</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class Activity {
  readonly entries = inject(MockDataService).activity();
}
