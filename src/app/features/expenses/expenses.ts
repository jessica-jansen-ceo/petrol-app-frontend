import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, Expense } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { toCsv, download } from '../../shared/export';
import { exportPdf } from '../../shared/pdf';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [PageHeader, MoneyPipe, ModalForm],
  template: `
    <app-page-header title="Expenses" subtitle="Track station running costs.">
      <button class="btn-ghost" (click)="exportCsv()">Export CSV</button>
      <button class="btn-ghost" (click)="exportPdf()">Export PDF</button>
      @if (perms.canCreate('expenses')) { <button class="btn-primary" (click)="openCreate()">+ Add Expense</button> }
    </app-page-header>

    <div class="toolbar">
      <input class="search" placeholder="Search category or description…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
    </div>

    <div class="panel">
      @if (filtered().length === 0) {
        <div class="empty">No expenses found.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th>
            @if (perms.canModify('expenses')) { <th></th> }</tr></thead>
          <tbody>
            @for (e of filtered(); track e.id) {
              <tr><td>{{ e.date }}</td><td>{{ e.category }}</td><td>{{ e.description }}</td><td>{{ e.amount | money }}</td>
                @if (perms.canModify('expenses')) {
                  <td><div class="row-actions">
                    <button class="icon-btn" title="Edit" (click)="openEdit(e)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(e)">🗑</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form [title]="editing() ? 'Edit Expense' : 'Add Expense'" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Expenses {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly expenses = this.data.viewExpenses;
  query = signal('');
  open = signal(false);
  editing = signal<Expense | null>(null);
  fields: FormField[] = [];

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const rows = this.expenses();
    return q ? rows.filter((e) => (e.category + ' ' + e.description).toLowerCase().includes(q)) : rows;
  });

  private buildFields(e?: Expense): FormField[] {
    return [
      { key: 'station', label: 'Station', type: 'select', options: this.data.stationNames(), value: e ? this.data.stationName(e.stationId) : this.data.defaultStationName() },
      { key: 'date', label: 'Date', type: 'date', required: true, value: e?.date ?? new Date().toISOString().slice(0, 10) },
      { key: 'category', label: 'Category', type: 'select', options: ['Maintenance', 'Utilities', 'Supplies', 'Salaries', 'Other'], value: e?.category },
      { key: 'description', label: 'Description', type: 'text', required: true, value: e?.description ?? '' },
      { key: 'amount', label: 'Amount', type: 'number', required: true, min: 0, value: e?.amount ?? 0 },
    ];
  }

  openCreate() { this.editing.set(null); this.fields = this.buildFields(); this.open.set(true); }
  openEdit(e: Expense) { this.editing.set(e); this.fields = this.buildFields(e); this.open.set(true); }

  save(v: Record<string, string>) {
    const rec = { stationId: this.data.stationIdByName(v['station']), date: v['date'], category: v['category'], description: v['description'], amount: Number(v['amount']) || 0 };
    const cur = this.editing();
    if (cur) { this.data.update<Expense>('expenses', cur.id, rec); this.toast.show('Expense updated'); }
    else { this.data.add<Expense>('expenses', rec); this.data.log('Added expense'); this.toast.show('Expense added'); }
    this.open.set(false);
  }

  async del(e: Expense) {
    if (await this.confirm.ask(`Delete expense "${e.description}"?`)) {
      this.data.remove('expenses', e.id);
      this.toast.show('Expense deleted', 'info');
    }
  }

  exportCsv() {
    download('expenses.csv', toCsv(this.filtered(), ['date', 'category', 'description', 'amount']));
  }

  exportPdf() {
    exportPdf({
      title: 'Expenses',
      columns: [
        { key: 'date', label: 'Date' }, { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' },
      ],
      rows: this.filtered(),
    });
  }
}
