import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';
import { SettingsService, CURRENCIES } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CLIENT_CONFIG } from '../../config/client.config';
import { download } from '../../shared/export';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Settings" subtitle="Admin configuration."></app-page-header>

    <div class="cols">
      <!-- Display preferences (staged → Save) -->
      <div class="panel">
        <h2>Display Preferences</h2>
        <label>
          <span>Display currency</span>
          <select [value]="draftCurrency()" (change)="draftCurrency.set($any($event.target).value)">
            @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <p class="preview">Preview: <strong>{{ preview() }}</strong></p>
        <label style="margin-top:1rem">
          <span>Low-stock alert threshold (%)</span>
          <input type="number" min="1" max="99" [value]="draftThreshold()"
                 (input)="draftThreshold.set(+$any($event.target).value)" />
        </label>
        <p class="hint">Tanks below this fill level are flagged on the dashboard and inventory.</p>
        <button class="btn-primary" (click)="saveSettings()" [disabled]="!dirty()">Save Settings</button>
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

      <!-- Fuel types + colours -->
      <div class="panel">
        <h2>Fuel Types &amp; Colours</h2>
        <p class="hint">Each fuel has a colour used in charts. Removing a fuel also removes its data.</p>
        <table class="feature-table">
          <thead><tr><th>Colour</th><th>Fuel</th><th></th></tr></thead>
          <tbody>
            @for (f of fuelTypes(); track f) {
              <tr>
                <td><input class="swatch" type="color" [value]="swatch(f)"
                      (input)="data.setFuelColor(f, $any($event.target).value)" /></td>
                <td>{{ f }}</td>
                <td><div class="row-actions">
                  <button class="icon-btn" title="Rename" (click)="openRename(f)">✎</button>
                  <button class="icon-btn danger" title="Remove" (click)="removeFuel(f)">🗑</button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="add-row">
          <input type="text" placeholder="e.g. Petrol 91 / LPG"
                 [value]="newFuel()" (input)="newFuel.set($any($event.target).value)" />
          <button class="btn-primary" (click)="addFuel()">Add Fuel</button>
        </div>
      </div>

      <!-- Data control -->
      <div class="panel">
        <h2>Data</h2>
        <p class="hint">Back up, restore, reload the demo dataset, or wipe everything to a clean slate.</p>
        <div class="add-row">
          <button class="btn-ghost" (click)="exportBackup()">Export Backup</button>
          <label class="btn-ghost file-label">Import Backup
            <input type="file" accept="application/json" (change)="importBackup($event)" hidden />
          </label>
        </div>
        <div class="add-row" style="margin-top:.6rem">
          <button class="btn-primary" (click)="loadMock()">Load Mock Data</button>
          <button class="btn-danger" (click)="clearAll()">Clear All Data</button>
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
    .swatch { width: 40px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer; }
    .preview { margin: 1rem 0 0; color: var(--text); }
    .add-row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .add-row > input[type=text] { flex: 1; padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); }
    .file-label { cursor: pointer; display: inline-flex; align-items: center; }
    .btn-danger { background: #dc2626; color: #fff; border: none; padding: .55rem .95rem; border-radius: 9px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
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

  // Staged display preferences — applied on Save.
  draftCurrency = signal(this.settings.currency());
  draftThreshold = signal(Math.round(this.settings.lowStockPct() * 100));

  renameOpen = signal(false);
  renameFields: FormField[] = [];
  private renaming = '';

  dirty() {
    return this.draftCurrency() !== this.settings.currency()
      || this.draftThreshold() !== Math.round(this.settings.lowStockPct() * 100);
  }

  preview() {
    return new Intl.NumberFormat(CLIENT_CONFIG.locale.code, {
      style: 'currency', currency: this.draftCurrency(), maximumFractionDigits: 0,
    }).format(12345);
  }

  saveSettings() {
    this.settings.setCurrency(this.draftCurrency());
    const pct = Math.min(99, Math.max(1, this.draftThreshold() || 25));
    this.draftThreshold.set(pct);
    this.settings.setLowStockPct(pct / 100);
    this.toast.show('Settings saved');
  }

  setPrice(fuel: string, v: string) {
    this.data.setPrice(fuel, Number(v) || 0);
    this.toast.show(`${fuel} price updated`);
  }

  swatch(fuel: string) {
    const c = this.data.colorFor(fuel);
    return c.startsWith('#') ? c : '#0f766e';
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
    const u = this.data.fuelUsage(fuel);
    const parts: string[] = [];
    if (u.sales) parts.push(`${u.sales} sale(s)`);
    if (u.meters) parts.push(`${u.meters} meter reading(s)`);
    if (u.tanks) parts.push(`${u.tanks} tank(s)`);
    if (u.prices) parts.push(`its price entry`);
    const detail = parts.length ? ` This will also permanently delete ${parts.join(', ')}.` : '';
    if (await this.confirm.ask(`Remove fuel type "${fuel}"?${detail} This cannot be undone.`)) {
      this.data.removeFuelType(fuel);
      this.toast.show(`${fuel} and its data removed`, 'info');
    }
  }

  exportBackup() {
    download(`fuelflow-backup-${new Date().toISOString().slice(0, 10)}.json`, this.data.exportAll(), 'application/json');
    this.toast.show('Backup exported');
  }

  importBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.data.importAll(String(reader.result));
        this.toast.show('Backup restored');
      } catch {
        this.toast.show('Invalid backup file', 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  async loadMock() {
    if (await this.confirm.ask('Replace all current data with the built-in demo dataset?')) {
      this.data.loadMockData();
      this.toast.show('Demo data loaded');
    }
  }

  async clearAll() {
    if (await this.confirm.ask('Permanently delete ALL data, including demo data? The app will start empty (no pumps, employees, sales, etc.).')) {
      this.data.clearAll();
      this.toast.show('All data cleared', 'info');
    }
  }
}
