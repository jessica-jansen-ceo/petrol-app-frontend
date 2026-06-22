import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-meter-readings',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Meter Readings" subtitle="Opening/closing pump meters and auto-calculated dispensed volume.">
      <button class="btn-primary" (click)="open.set(true)">+ Record Reading</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Pump</th><th>Fuel</th><th>Opening</th><th>Closing</th><th>Dispensed (auto)</th></tr></thead>
        <tbody>
          @for (r of readings(); track $index) {
            <tr><td>{{ r.pump }}</td><td>{{ r.fuel }}</td><td>{{ r.opening }}</td><td>{{ r.closing }}</td>
              <td><strong>{{ r.dispensed }}</strong></td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal-form title="Record Meter Reading" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class MeterReadings {
  private data = inject(MockDataService);
  readonly readings = this.data.meterReadings();
  open = signal(false);

  fields: FormField[] = [
    { key: 'pump', label: 'Pump', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4'] },
    { key: 'fuel', label: 'Fuel', type: 'select', options: ['Petrol 95', 'Petrol 93', 'Diesel'] },
    { key: 'opening', label: 'Opening', type: 'number', value: 0 },
    { key: 'closing', label: 'Closing', type: 'number', value: 0 },
  ];

  save(v: Record<string, string>) {
    const opening = Number(v['opening']) || 0;
    const closing = Number(v['closing']) || 0;
    this.data.addMeterReading({
      pump: v['pump'],
      fuel: v['fuel'],
      opening,
      closing,
      dispensed: Math.max(0, closing - opening),
    });
    this.open.set(false);
  }
}
