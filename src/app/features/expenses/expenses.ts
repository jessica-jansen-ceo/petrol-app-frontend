import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [PageHeader, MoneyPipe],
  template: `
    <app-page-header title="Expenses" subtitle="Track station running costs.">
      <button class="btn-primary">+ Add Expense</button>
    </app-page-header>
    <div class="panel">
      <table class="feature-table">
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          @for (e of expenses; track $index) {
            <tr><td>{{ e.date }}</td><td>{{ e.category }}</td><td>{{ e.description }}</td><td>{{ e.amount | money }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Expenses {
  readonly expenses = inject(MockDataService).expenses();
}
