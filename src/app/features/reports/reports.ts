import { Component, computed, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { BarChart } from '../../shared/bar-chart';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';
import { toCsv, download } from '../../shared/export';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [PageHeader, BarChart, MoneyPipe],
  template: `
    <app-page-header title="Reports" subtitle="Daily / weekly / monthly sales, aggregated from recorded data.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      <button class="btn-primary" (click)="print()">Print / Save PDF</button>
    </app-page-header>

    <div class="panel" style="margin-bottom:1rem">
      <h2 style="margin:0 0 1rem;font-size:1rem">Revenue — last 7 days</h2>
      <app-bar-chart [data]="revenue()"></app-bar-chart>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 1rem;font-size:1rem">Period summary</h2>
      <table class="feature-table">
        <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
        <tbody>
          @for (p of periods(); track p.period) {
            <tr><td>{{ p.period }}</td><td>{{ p.litres }}</td><td>{{ p.revenue | money }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Reports {
  private data = inject(MockDataService);
  readonly revenue = computed(() => { this.data.fuelSales()(); return this.data.weeklyRevenue(); });

  readonly periods = computed(() => {
    const sales = this.data.fuelSales()();
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
    const sum = (from: string) => {
      const rows = sales.filter((s) => s.date >= from);
      return { litres: rows.reduce((a, s) => a + s.litres, 0), revenue: rows.reduce((a, s) => a + s.amount, 0) };
    };
    const day = sum(today), week = sum(weekAgo), month = sum(monthAgo);
    return [
      { period: 'Today', litres: day.litres, revenue: day.revenue },
      { period: 'Last 7 days', litres: week.litres, revenue: week.revenue },
      { period: 'Last 30 days', litres: month.litres, revenue: month.revenue },
    ];
  });

  exportCsv() {
    download('sales-report.csv', toCsv(this.periods(), ['period', 'litres', 'revenue']));
  }

  print() {
    window.print();
  }
}
