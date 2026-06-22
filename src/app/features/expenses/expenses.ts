import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [PageHeader, MoneyPipe, ModalForm],
  template: `
    <app-page-header title="Expenses" subtitle="Track station running costs.">
      <button class="btn-primary" (click)="open.set(true)">+ Add Expense</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          @for (e of expenses(); track $index) {
            <tr><td>{{ e.date }}</td><td>{{ e.category }}</td><td>{{ e.description }}</td><td>{{ e.amount | money }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal-form title="Add Expense" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Expenses {
  private data = inject(MockDataService);
  readonly expenses = this.data.expenses();
  open = signal(false);

  fields: FormField[] = [
    { key: 'date', label: 'Date', type: 'date', value: new Date().toISOString().slice(0, 10) },
    { key: 'category', label: 'Category', type: 'select', options: ['Maintenance', 'Utilities', 'Supplies', 'Salaries', 'Other'] },
    { key: 'description', label: 'Description', type: 'text', value: '' },
    { key: 'amount', label: 'Amount', type: 'number', value: 0 },
  ];

  save(v: Record<string, string>) {
    this.data.addExpense({
      date: v['date'],
      category: v['category'],
      description: v['description'] || '—',
      amount: Number(v['amount']) || 0,
    });
    this.open.set(false);
  }
}
