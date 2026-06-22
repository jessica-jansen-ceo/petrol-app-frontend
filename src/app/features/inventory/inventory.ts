import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Fuel Inventory" subtitle="Tank stock levels.">
      <button class="btn-primary" (click)="open.set(true)">+ Stock Delivery</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Fuel</th><th>Capacity</th><th>Current</th><th>Level</th></tr></thead>
        <tbody>
          @for (s of stock(); track $index) {
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

    <app-modal-form title="Stock Delivery" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Inventory {
  private data = inject(MockDataService);
  readonly unit = CLIENT_CONFIG.locale.volumeUnit;
  readonly stock = this.data.stock();
  open = signal(false);

  fields: FormField[] = [
    { key: 'fuel', label: 'Fuel', type: 'select', options: ['Petrol 95', 'Petrol 93', 'Diesel'] },
    { key: 'capacity', label: 'Tank Capacity', type: 'number', value: 30000 },
    { key: 'current', label: 'Current Level', type: 'number', value: 0 },
  ];

  pct(s: { current: number; capacity: number }) {
    return Math.round((s.current / s.capacity) * 100);
  }

  save(v: Record<string, string>) {
    this.data.addStock({
      fuel: v['fuel'],
      capacity: Number(v['capacity']) || 0,
      current: Number(v['current']) || 0,
    });
    this.open.set(false);
  }
}
