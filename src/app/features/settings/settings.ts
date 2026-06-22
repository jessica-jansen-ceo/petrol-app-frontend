import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';
import { SettingsService, CURRENCIES } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeader, MoneyPipe],
  template: `
    <app-page-header title="Settings" subtitle="Admin configuration."></app-page-header>

    <div class="cols">
      <div class="panel">
        <h2>Currency</h2>
        <p class="hint">Changes how money is displayed across the whole app.</p>
        <label>
          <span>Display currency</span>
          <select [value]="settings.currency()" (change)="setCurrency($any($event.target).value)">
            @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <p class="preview">Preview: <strong>{{ 12345 | money }}</strong></p>
      </div>

      <div class="panel">
        <h2>Fuel Types</h2>
        <p class="hint">Preloaded with Petrol 95, Petrol 93 and Diesel. Added types appear in every fuel dropdown.</p>
        <ul class="chips">
          @for (f of fuelTypes(); track f) { <li>{{ f }}</li> }
        </ul>
        <div class="add-row">
          <input type="text" placeholder="e.g. Petrol 91 / LPG"
                 [value]="newFuel()" (input)="newFuel.set($any($event.target).value)" />
          <button class="btn-primary" (click)="addFuel()">Add Fuel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    h2 { margin: 0 0 .35rem; font-size: 1rem; color: var(--text); }
    .hint { margin: 0 0 1rem; color: var(--text-muted); font-size: .85rem; }
    label { display: flex; flex-direction: column; gap: .35rem; font-size: .82rem; font-weight: 600; color: var(--text-muted); max-width: 240px; }
    select, input { padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); font-size: .95rem; }
    .preview { margin: 1rem 0 0; color: var(--text); }
    .chips { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-wrap: wrap; gap: .5rem; }
    .chips li { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); padding: .3rem .7rem; border-radius: 999px; font-size: .85rem; font-weight: 600; }
    .add-row { display: flex; gap: .5rem; }
    .add-row input { flex: 1; }
    @media (max-width: 820px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class Settings {
  private data = inject(MockDataService);
  readonly settings = inject(SettingsService);
  readonly currencies = CURRENCIES;
  readonly fuelTypes = this.data.fuelTypes();
  newFuel = signal('');

  setCurrency(code: string) {
    this.settings.setCurrency(code);
  }

  addFuel() {
    this.data.addFuelType(this.newFuel());
    this.newFuel.set('');
  }
}
