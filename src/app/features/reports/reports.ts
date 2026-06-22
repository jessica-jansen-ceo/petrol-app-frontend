import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { BarChart } from '../../shared/bar-chart';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [PageHeader, BarChart, MoneyPipe],
  template: `
    <app-page-header title="Reports" subtitle="Daily / weekly / monthly sales reporting.">
      <button class="btn-primary" (click)="exportNote()">Export PDF / Excel</button>
    </app-page-header>

    <div class="panel" style="margin-bottom:1rem">
      <h2 style="margin:0 0 1rem;font-size:1rem">Weekly revenue</h2>
      <app-bar-chart [data]="revenue"></app-bar-chart>
    </div>

    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
        <tbody>
          <tr><td>Today</td><td>8,123</td><td>{{ 55100 | money }}</td></tr>
          <tr><td>This week</td><td>54,980</td><td>{{ 365800 | money }}</td></tr>
          <tr><td>This month</td><td>231,400</td><td>{{ 1542300 | money }}</td></tr>
        </tbody>
      </table>
    </div>

    @if (note) { <p style="color:var(--text-muted);margin-top:1rem">{{ note }}</p> }
  `,
})
export class Reports {
  readonly revenue = inject(MockDataService).weeklyRevenue();
  note = '';
  exportNote() { this.note = 'POC: export wiring is stubbed — connect to backend report endpoints to generate real PDF/Excel files.'; }
}
