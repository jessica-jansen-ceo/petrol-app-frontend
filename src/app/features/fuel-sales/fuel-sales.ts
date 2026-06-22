import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-fuel-sales',
  standalone: true,
  imports: [PageHeader, MoneyPipe, ModalForm],
  template: `
    <app-page-header title="Fuel Sales" subtitle="Daily fuel sales entries.">
      <button class="btn-primary" (click)="open.set(true)">+ New Sale</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Date</th><th>Fuel</th><th>Litres</th><th>Price/L</th><th>Amount</th><th>Operator</th></tr></thead>
        <tbody>
          @for (s of sales(); track $index) {
            <tr>
              <td>{{ s.date }}</td><td>{{ s.fuel }}</td><td>{{ s.litres }}</td>
              <td>{{ s.pricePerLitre | money }}</td><td>{{ s.amount | money }}</td><td>{{ s.operator }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal-form title="New Fuel Sale" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class FuelSales {
  private data = inject(MockDataService);
  readonly sales = this.data.fuelSales();
  open = signal(false);

  fields: FormField[] = [
    { key: 'date', label: 'Date', type: 'date', value: new Date().toISOString().slice(0, 10) },
    { key: 'fuel', label: 'Fuel', type: 'select', options: ['Petrol 95', 'Petrol 93', 'Diesel'] },
    { key: 'litres', label: 'Litres', type: 'number', value: 0 },
    { key: 'pricePerLitre', label: 'Price / Litre', type: 'number', value: 23.4 },
    { key: 'operator', label: 'Operator', type: 'text', value: '' },
  ];

  save(v: Record<string, string>) {
    const litres = Number(v['litres']) || 0;
    const pricePerLitre = Number(v['pricePerLitre']) || 0;
    this.data.addFuelSale({
      date: v['date'],
      fuel: v['fuel'],
      litres,
      pricePerLitre,
      amount: Math.round(litres * pricePerLitre * 100) / 100,
      operator: v['operator'] || 'Unknown',
    });
    this.open.set(false);
  }
}
