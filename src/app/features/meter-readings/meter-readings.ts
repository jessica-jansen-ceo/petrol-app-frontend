import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, MeterReading } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { toCsv, download } from '../../shared/export';
import { exportPdf } from '../../shared/pdf';

@Component({
  selector: 'app-meter-readings',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Meter Readings" subtitle="Opening/closing pump meters with auto-calculated dispensed volume.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      <button class="btn-ghost" (click)="exportPdf()">Export PDF</button>
      @if (perms.canCreate('meters')) { <button class="btn-primary" (click)="openCreate()">+ Record Reading</button> }
    </app-page-header>

    <div class="toolbar">
      <input class="search" placeholder="Search pump or fuel…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
    </div>

    <div class="panel">
      @if (filtered().length === 0) {
        <div class="empty">No readings found.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Pump</th><th>Fuel</th><th>Opening</th><th>Closing</th><th>Dispensed</th>
            @if (perms.canModify('meters')) { <th></th> }</tr></thead>
          <tbody>
            @for (r of filtered(); track r.id) {
              <tr><td>{{ r.pump }}</td><td>{{ r.fuel }}</td><td>{{ r.opening }}</td><td>{{ r.closing }}</td>
                <td><strong>{{ r.dispensed }}</strong></td>
                @if (perms.canModify('meters')) {
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openEdit(r)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(r)">🗑</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form [title]="editing() ? 'Edit Reading' : 'Record Meter Reading'" [open]="open()" [fields]="fields"
      [validate]="validate" (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class MeterReadings {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly readings = this.data.meterReadings();
  query = signal('');
  open = signal(false);
  editing = signal<MeterReading | null>(null);
  fields: FormField[] = [];

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const rows = this.readings();
    return q ? rows.filter((r) => (r.pump + ' ' + r.fuel).toLowerCase().includes(q)) : rows;
  });

  validate = (m: Record<string, string>) =>
    Number(m['closing']) < Number(m['opening']) ? 'Closing must be greater than or equal to opening.' : null;

  private buildFields(r?: MeterReading): FormField[] {
    return [
      { key: 'pump', label: 'Pump', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4'], value: r?.pump },
      { key: 'fuel', label: 'Fuel', type: 'select', options: this.data.fuelTypes()(), value: r?.fuel },
      { key: 'opening', label: 'Opening', type: 'number', required: true, min: 0, value: r?.opening ?? 0 },
      { key: 'closing', label: 'Closing', type: 'number', required: true, min: 0, value: r?.closing ?? 0 },
    ];
  }

  openCreate() { this.editing.set(null); this.fields = this.buildFields(); this.open.set(true); }
  openEdit(r: MeterReading) { this.editing.set(r); this.fields = this.buildFields(r); this.open.set(true); }

  save(v: Record<string, string>) {
    const opening = Number(v['opening']) || 0;
    const closing = Number(v['closing']) || 0;
    const rec = { pump: v['pump'], fuel: v['fuel'], opening, closing, dispensed: Math.max(0, closing - opening) };
    const cur = this.editing();
    if (cur) { this.data.update<MeterReading>('meterReadings', cur.id, rec); this.toast.show('Reading updated'); }
    else { this.data.add<MeterReading>('meterReadings', rec); this.data.log('Recorded meter reading'); this.toast.show('Reading recorded'); }
    this.open.set(false);
  }

  async del(r: MeterReading) {
    if (await this.confirm.ask(`Delete the ${r.pump} reading?`)) {
      this.data.remove('meterReadings', r.id);
      this.toast.show('Reading deleted', 'info');
    }
  }

  exportCsv() {
    download('meter-readings.csv', toCsv(this.filtered(), ['pump', 'fuel', 'opening', 'closing', 'dispensed']));
  }

  exportPdf() {
    exportPdf({
      title: 'Meter Readings',
      columns: [
        { key: 'pump', label: 'Pump' }, { key: 'fuel', label: 'Fuel' }, { key: 'opening', label: 'Opening' },
        { key: 'closing', label: 'Closing' }, { key: 'dispensed', label: 'Dispensed' },
      ],
      rows: this.filtered(),
    });
  }
}
