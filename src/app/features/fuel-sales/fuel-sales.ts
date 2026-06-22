import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, FuelSale } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { toCsv, download } from '../../shared/export';

@Component({
  selector: 'app-fuel-sales',
  standalone: true,
  imports: [PageHeader, MoneyPipe, ModalForm],
  template: `
    <app-page-header title="Fuel Sales" subtitle="Daily fuel sales entries. Price is applied automatically from the price book.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      @if (perms.canCreate('sales')) { <button class="btn-primary" (click)="openCreate()">+ New Sale</button> }
    </app-page-header>

    <div class="toolbar">
      <input class="search" placeholder="Search fuel or operator…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
    </div>

    <div class="panel">
      @if (filtered().length === 0) {
        <div class="empty">No sales found.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Date</th><th>Fuel</th><th>Litres</th><th>Price/L</th><th>Amount</th><th>Operator</th>
            @if (perms.canModify('sales')) { <th></th> }</tr></thead>
          <tbody>
            @for (s of filtered(); track s.id) {
              <tr>
                <td>{{ s.date }}</td><td>{{ s.fuel }}</td><td>{{ s.litres }}</td>
                <td>{{ s.pricePerLitre | money }}</td><td>{{ s.amount | money }}</td><td>{{ s.operator }}</td>
                @if (perms.canModify('sales')) {
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openEdit(s)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(s)">🗑</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form [title]="editing() ? 'Edit Sale' : 'New Fuel Sale'" [open]="open()" [fields]="fields"
      [validate]="validate" (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class FuelSales {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly sales = this.data.fuelSales();
  query = signal('');
  open = signal(false);
  editing = signal<FuelSale | null>(null);
  fields: FormField[] = [];

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const rows = this.sales();
    return q ? rows.filter((s) => (s.fuel + ' ' + s.operator).toLowerCase().includes(q)) : rows;
  });

  validate = (m: Record<string, string>) =>
    Number(m['litres']) <= 0 ? 'Litres must be greater than 0.' : null;

  private buildFields(s?: FuelSale): FormField[] {
    return [
      { key: 'date', label: 'Date', type: 'date', required: true, value: s?.date ?? new Date().toISOString().slice(0, 10) },
      { key: 'fuel', label: 'Fuel', type: 'select', options: this.data.fuelTypes()(), value: s?.fuel },
      { key: 'litres', label: 'Litres', type: 'number', required: true, min: 0, value: s?.litres ?? 0 },
      { key: 'operator', label: 'Operator', type: 'text', required: true, value: s?.operator ?? this.auth.user()?.displayName ?? '' },
    ];
  }

  openCreate() {
    this.editing.set(null);
    this.fields = this.buildFields();
    this.open.set(true);
  }

  openEdit(s: FuelSale) {
    this.editing.set(s);
    this.fields = this.buildFields(s);
    this.open.set(true);
  }

  save(v: Record<string, string>) {
    const input = { date: v['date'], fuel: v['fuel'], litres: Number(v['litres']) || 0, operator: v['operator'] };
    const cur = this.editing();
    if (cur) {
      this.data.editSale(cur.id, input);
      this.toast.show('Sale updated');
    } else {
      this.data.recordSale(input);
      this.toast.show('Sale recorded');
    }
    this.open.set(false);
  }

  async del(s: FuelSale) {
    if (await this.confirm.ask(`Delete this ${s.fuel} sale? Stock will be restored.`)) {
      this.data.deleteSale(s.id);
      this.toast.show('Sale deleted', 'info');
    }
  }

  exportCsv() {
    const cols = ['date', 'fuel', 'litres', 'pricePerLitre', 'amount', 'operator'];
    download('fuel-sales.csv', toCsv(this.filtered(), cols));
  }
}
