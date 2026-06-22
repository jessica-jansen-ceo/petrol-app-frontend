import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';
import { SettingsService, CURRENCIES } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { download } from '../../shared/export';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeader, MoneyPipe, ModalForm],
  template: `
    <app-page-header title="Settings" subtitle="Admin configuration."></app-page-header>

    <div class="cols">
      <!-- Currency + thresholds -->
      <div class="panel">
        <h2>Currency &amp; Alerts</h2>
        <label>
          <span>Display currency</span>
          <select [value]="settings.currency()" (change)="settings.setCurrency($any($event.target).value)">
            @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <p class="preview">Preview: <strong>{{ 12345 | money }}</strong></p>
        <label style="margin-top:1rem">
          <span>Low-stock alert threshold (%)</span>
          <input type="number" min="1" max="99" [value]="thresholdPct()"
                 (change)="setThreshold($any($event.target).value)" />
        </label>
        <p class="hint">Tanks below this fill level are flagged on the dashboard and inventory.</p>
      </div>

      <!-- Price book -->
      <div class="panel">
        <h2>Price Book</h2>
        <p class="hint">Prices applied automatically to new sales.</p>
        <table class="feature-table">
          <thead><tr><th>Fuel</th><th>Price / Litre</th></tr></thead>
          <tbody>
            @for (f of fuelTypes(); track f) {
              <tr>
                <td>{{ f }}</td>
                <td><input class="price" type="number" min="0" step="0.01"
                      [value]="data.priceFor(f)" (change)="setPrice(f, $any($event.target).value)" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Fuel types -->
      <div class="panel">
        <h2>Fuel Types</h2>
        <p class="hint">Preloaded with Petrol 95, Petrol 93 and Diesel. A fuel can't be removed while a tank or price uses it.</p>
        <ul class="chips">
          @for (f of fuelTypes(); track f) {
            <li>{{ f }}
              <button class="chip-btn" title="Rename" (click)="openRename(f)">✎</button>
              <button class="chip-btn" title="Remove" (click)="removeFuel(f)">×</button>
            </li>
          }
        </ul>
        <div class="add-row">
          <input type="text" placeholder="e.g. Petrol 91 / LPG"
                 [value]="newFuel()" (input)="newFuel.set($any($event.target).value)" />
          <button class="btn-primary" (click)="addFuel()">Add Fuel</button>
        </div>
      </div>

      <!-- Backup -->
      <div class="panel">
        <h2>Data Backup</h2>
        <p class="hint">Export all data to a JSON file, or restore from a previous backup.</p>
        <div class="add-row">
          <button class="btn-ghost" (click)="exportBackup()">Export Backup</button>
          <label class="btn-primary file-label">
            Import Backup
            <input type="file" accept="application/json" (change)="importBackup($event)" hidden />
          </label>
        </div>
      </div>
    </div>

    <app-modal-form title="Rename Fuel" [open]="renameOpen()" [fields]="renameFields"
      (cancel)="renameOpen.set(false)" (save)="saveRename($event)"></app-modal-form>
  `,
  styles: [`
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
    h2 { margin: 0 0 .35rem; font-size: 1rem; color: var(--text); }
    .hint { margin: .25rem 0 1rem; color: var(--text-muted); font-size: .85rem; }
    label { display: flex; flex-direction: column; gap: .35rem; font-size: .82rem; font-weight: 600; color: var(--text-muted); max-width: 260px; }
    select, label input { padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); font-size: .95rem; }
    .price { width: 110px; padding: .4rem .5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); }
    .preview { margin: 1rem 0 0; color: var(--text); }
    .chips { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-wrap: wrap; gap: .5rem; }
    .chips li { display: inline-flex; align-items: center; gap: .35rem; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); padding: .3rem .55rem .3rem .7rem; border-radius: 999px; font-size: .85rem; font-weight: 600; }
    .chip-btn { border: none; background: transparent; color: inherit; cursor: pointer; font-size: .9rem; line-height: 1; opacity: .7; }
    .chip-btn:hover { opacity: 1; }
    .add-row { display: flex; gap: .5rem; flex-wrap: wrap; }
    .add-row > input[type=text] { flex: 1; padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); }
    .file-label { cursor: pointer; display: inline-flex; align-items: center; }
    @media (max-width: 820px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class Settings {
  readonly data = inject(MockDataService);
  readonly settings = inject(SettingsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly currencies = CURRENCIES;
  readonly fuelTypes = this.data.fuelTypes();
  newFuel = signal('');
  thresholdPct = signal(Math.round(this.settings.lowStockPct() * 100));

  renameOpen = signal(false);
  renameFields: FormField[] = [];
  private renaming = '';

  setThreshold(v: string) {
    const pct = Math.min(99, Math.max(1, Number(v) || 25));
    this.thresholdPct.set(pct);
    this.settings.setLowStockPct(pct / 100);
    this.toast.show('Threshold updated');
  }

  setPrice(fuel: string, v: string) {
    this.data.setPrice(fuel, Number(v) || 0);
    this.toast.show(`${fuel} price updated`);
  }

  addFuel() {
    if (this.data.addFuelType(this.newFuel())) {
      this.toast.show('Fuel type added');
      this.newFuel.set('');
    } else {
      this.toast.show('Enter a unique, non-empty name', 'error');
    }
  }

  openRename(fuel: string) {
    this.renaming = fuel;
    this.renameFields = [{ key: 'name', label: 'New name', type: 'text', required: true, value: fuel }];
    this.renameOpen.set(true);
  }

  saveRename(v: Record<string, string>) {
    if (this.data.renameFuelType(this.renaming, v['name'])) this.toast.show('Fuel renamed');
    else this.toast.show('Name must be unique', 'error');
    this.renameOpen.set(false);
  }

  async removeFuel(fuel: string) {
    const blocker = this.data.fuelRemovalBlocker(fuel);
    if (blocker) { this.toast.show(`Can't remove ${fuel} — ${blocker}.`, 'error'); return; }
    if (await this.confirm.ask(`Remove fuel type "${fuel}"?`)) {
      this.data.removeFuelType(fuel);
      this.toast.show('Fuel removed', 'info');
    }
  }

  exportBackup() {
    download(`fuelflow-backup-${new Date().toISOString().slice(0, 10)}.json`, this.data.exportAll(), 'application/json');
    this.toast.show('Backup exported');
  }

  importBackup(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.data.importAll(String(reader.result));
        this.toast.show('Backup restored');
        this.thresholdPct.set(Math.round(this.settings.lowStockPct() * 100));
      } catch {
        this.toast.show('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  }
}
