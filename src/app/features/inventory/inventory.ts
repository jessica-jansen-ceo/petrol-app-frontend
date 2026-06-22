import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Fuel Inventory" subtitle="Tank stock levels.">
      <button class="btn-primary">+ Stock Delivery</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Fuel</th><th>Capacity</th><th>Current</th><th>Level</th></tr></thead>
        <tbody>
          @for (s of stock; track $index) {
            <tr>
              <td>{{ s.fuel }}</td>
              <td>{{ s.capacity }} {{ unit }}</td>
              <td>{{ s.current }} {{ unit }}</td>
              <td style="min-width:160px">
                <div class="bar-meter" [class.low]="pct(s) < 25">
                  <span [style.width.%]="pct(s)"></span>
                </div>
                <small>{{ pct(s) }}%</small>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Inventory {
  readonly unit = CLIENT_CONFIG.locale.volumeUnit;
  readonly stock = inject(MockDataService).stock();
  pct(s: { current: number; capacity: number }) {
    return Math.round((s.current / s.capacity) * 100);
  }
}
