import { Component, computed, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';
import { toCsv, download } from '../../shared/export';
import { exportPdf } from '../../shared/pdf';

@Component({
  selector: 'app-reconciliation',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Sales vs Meter Reconciliation"
      subtitle="Auto-compares litres sold against litres dispensed per fuel. Variance beyond tolerance is flagged.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      <button class="btn-ghost" (click)="exportPdf()">Export PDF</button>
    </app-page-header>

    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Fuel</th><th>Sold (L)</th><th>Dispensed (L)</th><th>Variance (L)</th><th>Variance %</th><th>Status</th></tr></thead>
        <tbody>
          @for (r of rows(); track r.fuel) {
            <tr>
              <td>{{ r.fuel }}</td><td>{{ r.soldLitres }}</td><td>{{ r.dispensedLitres }}</td>
              <td [style.color]="r.variance === 0 ? 'var(--text)' : (r.variance > 0 ? '#15803d' : '#dc2626')">{{ r.variance }}</td>
              <td>{{ r.variancePct }}%</td>
              <td><span class="badge" [class.active]="!r.flagged" [class.warn]="r.flagged">{{ r.flagged ? 'Review' : 'OK' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
      @if (flaggedCount() > 0) {
        <p style="margin:1rem 0 0;color:#b45309;font-weight:600">
          ⚠ {{ flaggedCount() }} fuel(s) need review — sold and dispensed volumes differ beyond tolerance.
        </p>
      } @else {
        <p style="margin:1rem 0 0;color:#15803d;font-weight:600">✓ All fuels reconcile within tolerance.</p>
      }
    </div>
  `,
})
export class Reconciliation {
  private data = inject(MockDataService);
  readonly rows = computed(() => {
    // Touch the source signals so this recomputes when data changes.
    this.data.fuelSales()();
    this.data.meterEntries()();
    return this.data.reconciliation();
  });
  readonly flaggedCount = computed(() => this.rows().filter((r) => r.flagged).length);

  exportCsv() {
    download('reconciliation.csv', toCsv(this.rows(), ['fuel', 'soldLitres', 'dispensedLitres', 'variance', 'variancePct', 'flagged']));
  }

  exportPdf() {
    exportPdf({
      title: 'Sales vs Meter Reconciliation',
      columns: [
        { key: 'fuel', label: 'Fuel' }, { key: 'soldLitres', label: 'Sold (L)' },
        { key: 'dispensedLitres', label: 'Dispensed (L)' }, { key: 'variance', label: 'Variance (L)' },
        { key: 'variancePct', label: 'Variance %' }, { key: 'flagged', label: 'Flagged' },
      ],
      rows: this.rows(),
    });
  }
}
