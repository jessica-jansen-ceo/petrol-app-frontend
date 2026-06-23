import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { toCsv, download } from '../../shared/export';
import { exportPdf } from '../../shared/pdf';
import { RANGES, RangeKey, rangeCutoff } from '../../shared/date-range';

@Component({
  selector: 'app-meter-readings',
  standalone: true,
  imports: [PageHeader, ModalForm, DatePipe],
  template: `
    <app-page-header title="Meter Ledger"
      subtitle="Append-only totalizer readings. Dispensed volume is derived from the difference between readings — entries can't be edited or deleted.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      <button class="btn-ghost" (click)="exportPdf()">Export PDF</button>
      @if (perms.canCreate('meters')) { <button class="btn-primary" (click)="openCreate()">+ Record Reading</button> }
    </app-page-header>

    <div class="toolbar">
      <input class="search" placeholder="Search dispenser, nozzle or fuel…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
      <div class="segmented">
        @for (r of ranges; track r.key) {
          <button [class.active]="range() === r.key" (click)="range.set(r.key)">{{ r.label }}</button>
        }
      </div>
    </div>

    <div class="panel">
      @if (rows().length === 0) {
        <div class="empty">No readings recorded.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Recorded</th><th>Station</th><th>Dispenser</th><th>Nozzle</th><th>Fuel</th>
            <th>Totalizer</th><th>Dispensed</th><th>By</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.entry.id) {
              <tr [style.background]="r.anomaly ? 'color-mix(in srgb,#dc2626 8%,transparent)' : ''">
                <td>{{ r.entry.recordedAt | date: 'short' }}</td>
                <td>{{ stationName(r.entry.stationId) }}</td>
                <td>{{ r.nozzle?.dispenser }}</td>
                <td>{{ r.nozzle?.label }}</td>
                <td>{{ r.nozzle?.fuel }}</td>
                <td>{{ r.entry.totalizer }}</td>
                <td>
                  @if (r.delta === null) { <span style="color:var(--text-muted)">— first</span> }
                  @else { <strong [style.color]="r.anomaly ? '#dc2626' : 'var(--text)'">{{ r.delta }}</strong> }
                  @if (r.anomaly) { <span class="badge warn" style="margin-left:.4rem">anomaly</span> }
                </td>
                <td>{{ r.entry.recordedBy }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form title="Record Meter Reading" submitLabel="Record" [open]="open()" [fields]="fields"
      [validate]="validate" (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class MeterReadings {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly ranges = RANGES;
  query = signal('');
  range = signal<RangeKey>('all');
  open = signal(false);
  fields: FormField[] = [];
  private nozzleByLabel = new Map<string, string>();

  readonly rows = computed(() => {
    const q = this.query().toLowerCase().trim();
    const cutoff = rangeCutoff(this.range());
    return this.data.ledgerView().filter((r) =>
      (!q || `${r.nozzle?.dispenser} ${r.nozzle?.label} ${r.nozzle?.fuel}`.toLowerCase().includes(q)) &&
      (!cutoff || r.entry.recordedAt.slice(0, 10) >= cutoff));
  });

  stationName = (id: string) => this.data.stationName(id);

  validate = (m: Record<string, string>) => {
    if (!this.nozzleByLabel.has(m['nozzle'])) return 'Pick a nozzle.';
    if (Number(m['totalizer']) < 0) return 'Totalizer cannot be negative.';
    return null;
  };

  openCreate() {
    this.nozzleByLabel.clear();
    const opts: string[] = [];
    for (const n of this.data.viewNozzles()) {
      const label = `${this.data.stationName(n.stationId)} · ${n.dispenser} · ${n.label} · ${n.fuel}`;
      this.nozzleByLabel.set(label, n.id);
      opts.push(label);
    }
    this.fields = [
      { key: 'nozzle', label: 'Nozzle', type: 'select', options: opts.length ? opts : ['— no nozzles —'] },
      { key: 'totalizer', label: 'Totalizer reading', type: 'number', required: true, min: 0, value: 0 },
      { key: 'note', label: 'Note (optional)', type: 'text', value: '' },
    ];
    this.open.set(true);
  }

  save(v: Record<string, string>) {
    const nozzleId = this.nozzleByLabel.get(v['nozzle']);
    if (!nozzleId) { this.toast.show('Pick a valid nozzle', 'error'); return; }
    this.data.addMeterEntry({ nozzleId, totalizer: Number(v['totalizer']) || 0, note: v['note'] || undefined });
    this.toast.show('Reading recorded');
    this.open.set(false);
  }

  private exportRows() {
    return this.rows().map((r) => ({
      recordedAt: r.entry.recordedAt.slice(0, 16).replace('T', ' '),
      station: this.data.stationName(r.entry.stationId),
      dispenser: r.nozzle?.dispenser, nozzle: r.nozzle?.label, fuel: r.nozzle?.fuel,
      totalizer: r.entry.totalizer, dispensed: r.delta ?? '', recordedBy: r.entry.recordedBy,
    }));
  }

  exportCsv() {
    download('meter-ledger.csv', toCsv(this.exportRows(), ['recordedAt', 'station', 'dispenser', 'nozzle', 'fuel', 'totalizer', 'dispensed', 'recordedBy']));
  }

  exportPdf() {
    exportPdf({
      title: 'Meter Ledger',
      columns: [
        { key: 'recordedAt', label: 'Recorded' }, { key: 'station', label: 'Station' },
        { key: 'dispenser', label: 'Dispenser' }, { key: 'nozzle', label: 'Nozzle' }, { key: 'fuel', label: 'Fuel' },
        { key: 'totalizer', label: 'Totalizer' }, { key: 'dispensed', label: 'Dispensed' }, { key: 'recordedBy', label: 'By' },
      ],
      rows: this.exportRows(),
    });
  }
}
