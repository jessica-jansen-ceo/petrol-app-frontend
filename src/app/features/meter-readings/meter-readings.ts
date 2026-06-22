import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-meter-readings',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Meter Readings" subtitle="Opening/closing pump meters and auto-calculated dispensed volume.">
      <button class="btn-primary">+ Record Reading</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Pump</th><th>Fuel</th><th>Opening</th><th>Closing</th><th>Dispensed (auto)</th></tr></thead>
        <tbody>
          @for (r of readings; track $index) {
            <tr><td>{{ r.pump }}</td><td>{{ r.fuel }}</td><td>{{ r.opening }}</td><td>{{ r.closing }}</td>
              <td><strong>{{ r.closing - r.opening }}</strong></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MeterReadings {
  readonly readings = inject(MockDataService).meterReadings();
}
