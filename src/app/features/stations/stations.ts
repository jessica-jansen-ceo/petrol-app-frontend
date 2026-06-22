import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, Station, Nozzle } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

type Mode = 'station' | 'nozzle';

@Component({
  selector: 'app-stations',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Stations & Pumps" subtitle="Manage stations and the dispensers/nozzles at each (Admin only)."></app-page-header>

    <div class="cols">
      <!-- Stations -->
      <div class="panel">
        <div class="head"><h2>Stations</h2><button class="btn-primary" (click)="openStation()">+ Add Station</button></div>
        @if (stations().length === 0) { <div class="empty">No stations.</div> }
        @else {
          <table class="feature-table">
            <thead><tr><th>Name</th><th>Code</th><th>Nozzles</th><th></th></tr></thead>
            <tbody>
              @for (s of stations(); track s.id) {
                <tr>
                  <td>{{ s.name }}</td><td>{{ s.code }}</td><td>{{ nozzleCount(s.id) }}</td>
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openStation(s)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="delStation(s)">🗑</button>
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Nozzles -->
      <div class="panel">
        <div class="head">
          <h2>Nozzles</h2>
          <button class="btn-primary" (click)="openNozzle()" [disabled]="stations().length === 0">+ Add Nozzle</button>
        </div>
        <label class="filter">
          <span>Station</span>
          <select [value]="filterStation()" (change)="filterStation.set($any($event.target).value)">
            @for (s of stations(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
          </select>
        </label>
        @if (nozzles().length === 0) { <div class="empty">No nozzles for this station.</div> }
        @else {
          <table class="feature-table">
            <thead><tr><th>Dispenser</th><th>Nozzle</th><th>Fuel</th><th></th></tr></thead>
            <tbody>
              @for (n of nozzles(); track n.id) {
                <tr>
                  <td>{{ n.dispenser }}</td><td>{{ n.label }}</td><td>{{ n.fuel }}</td>
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openNozzle(n)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="delNozzle(n)">🗑</button>
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <app-modal-form [title]="modalTitle()" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
  styles: [`
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    h2 { margin: 0; font-size: 1rem; color: var(--text); }
    .filter { display: flex; align-items: center; gap: .5rem; font-size: .82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 1rem; }
    .filter select { padding: .5rem .6rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class Stations {
  private data = inject(MockDataService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly stations = this.data.stations();
  filterStation = signal<string>(this.data.stations()()[0]?.id ?? '');
  open = signal(false);
  mode = signal<Mode>('station');
  editing = signal<Station | Nozzle | null>(null);
  fields: FormField[] = [];

  readonly nozzles = computed(() => this.data.nozzles()().filter((n) => n.stationId === this.filterStation()));

  modalTitle() {
    const editing = this.editing();
    return `${editing ? 'Edit' : 'Add'} ${this.mode() === 'station' ? 'Station' : 'Nozzle'}`;
  }
  nozzleCount(id: string) { return this.data.nozzles()().filter((n) => n.stationId === id).length; }

  // ─── Stations ───
  openStation(s?: Station) {
    this.mode.set('station');
    this.editing.set(s ?? null);
    this.fields = [
      { key: 'name', label: 'Station Name', type: 'text', required: true, value: s?.name ?? '' },
      { key: 'code', label: 'Code', type: 'text', required: true, value: s?.code ?? '' },
    ];
    this.open.set(true);
  }
  async delStation(s: Station) {
    if (await this.confirm.ask(`Delete station "${s.name}"? This permanently removes its nozzles, sales, meter ledger, tanks, expenses, shifts and employees.`)) {
      this.data.removeStation(s.id);
      if (this.filterStation() === s.id) this.filterStation.set(this.data.stations()()[0]?.id ?? '');
      this.toast.show('Station removed', 'info');
    }
  }

  // ─── Nozzles ───
  openNozzle(n?: Nozzle) {
    this.mode.set('nozzle');
    this.editing.set(n ?? null);
    this.fields = [
      { key: 'station', label: 'Station', type: 'select', options: this.data.stationNames(),
        value: n ? this.data.stationName(n.stationId) : this.data.stationName(this.filterStation()) },
      { key: 'dispenser', label: 'Dispenser', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4', 'Pump 5', 'Pump 6'], value: n?.dispenser },
      { key: 'label', label: 'Nozzle', type: 'select', options: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'], value: n?.label },
      { key: 'fuel', label: 'Fuel', type: 'select', options: this.data.fuelTypes()(), value: n?.fuel },
    ];
    this.open.set(true);
  }
  async delNozzle(n: Nozzle) {
    if (await this.confirm.ask(`Delete ${n.dispenser} ${n.label}? Its meter ledger entries will also be removed.`)) {
      this.data.removeNozzle(n.id);
      this.toast.show('Nozzle removed', 'info');
    }
  }

  save(v: Record<string, string>) {
    if (this.mode() === 'station') {
      const rec = { name: v['name'], code: v['code'] };
      const cur = this.editing() as Station | null;
      if (cur) { this.data.update<Station>('stations', cur.id, rec); this.toast.show('Station updated'); }
      else {
        const s = this.data.add<Station>('stations', rec);
        this.filterStation.set(s.id);
        this.toast.show('Station added');
      }
    } else {
      const rec = { stationId: this.data.stationIdByName(v['station']), dispenser: v['dispenser'], label: v['label'], fuel: v['fuel'] };
      const cur = this.editing() as Nozzle | null;
      if (cur) { this.data.update<Nozzle>('nozzles', cur.id, rec); this.toast.show('Nozzle updated'); }
      else { this.data.add<Nozzle>('nozzles', rec); this.toast.show('Nozzle added'); }
    }
    this.open.set(false);
  }
}
