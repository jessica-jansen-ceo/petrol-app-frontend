import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-fuel-sales',
  standalone: true,
  imports: [PageHeader, MoneyPipe],
  template: `
    <app-page-header title="Fuel Sales" subtitle="Daily fuel sales entries.">
      <button class="btn-primary">+ New Sale</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Date</th><th>Fuel</th><th>Litres</th><th>Price/L</th><th>Amount</th><th>Operator</th></tr></thead>
        <tbody>
          @for (s of sales; track $index) {
            <tr>
              <td>{{ s.date }}</td><td>{{ s.fuel }}</td><td>{{ s.litres }}</td>
              <td>{{ s.pricePerLitre | money }}</td><td>{{ s.amount | money }}</td><td>{{ s.operator }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class FuelSales {
  readonly sales = inject(MockDataService).fuelSales();
}
