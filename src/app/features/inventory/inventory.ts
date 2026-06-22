import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, StockItem } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CLIENT_CONFIG } from '../../config/client.config';

type Mode = 'delivery' | 'tank' | 'edit';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Fuel Inventory" subtitle="Tank stock levels. Selling fuel draws stock down automatically.">
      @if (perms.canCreate('inventory')) {
        <button class="btn-ghost" (click)="openDelivery()">+ Stock Delivery</button>
        <button class="btn-primary" (click)="openTank()">+ Add Tank</button>
      }
    </app-page-header>

    <div class="panel">
      @if (stock().length === 0) {
        <div class="empty">No tanks configured.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Fuel</th><th>Capacity</th><th>Current</th><th>Level</th>
            @if (perms.canModify('inventory')) { <th></th> }</tr></thead>
          <tbody>
            @for (s of stock(); track s.id) {
              <tr>
                <td>{{ s.fuel }}</td>
                <td>{{ s.capacity }} {{ unit }}</td>
                <td>{{ s.current }} {{ unit }}</td>
                <td style="min-width:170px">
                  <div class="bar-meter" [class.low]="pct(s) < 25"><span [style.width.%]="pct(s)"></span></div>
                  <small [style.color]="pct(s) < 25 ? '#dc2626' : 'var(--text-muted)'">{{ pct(s) }}%
                    @if (pct(s) < 25) { · low }
                  </small>
                </td>
                @if (perms.canModify('inventory')) {
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

    <app-modal-form [title]="modalTitle()" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Inventory {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly unit = CLIENT_CONFIG.locale.volumeUnit;
  readonly stock = this.data.stock();
  open = signal(false);
  mode = signal<Mode>('delivery');
  editing = signal<StockItem | null>(null);
  fields: FormField[] = [];

  modalTitle() {
    return this.mode() === 'delivery' ? 'Stock Delivery' : this.mode() === 'tank' ? 'Add Tank' : 'Edit Tank';
  }

  pct(s: StockItem) { return Math.round((s.current / s.capacity) * 100); }

  openDelivery() {
    this.mode.set('delivery');
    this.editing.set(null);
    this.fields = [
      { key: 'fuel', label: 'Fuel', type: 'select', options: this.stock().map((s) => s.fuel) },
      { key: 'litres', label: 'Litres delivered', type: 'number', required: true, min: 0, value: 0 },
    ];
    this.open.set(true);
  }

  openTank() {
    this.mode.set('tank');
    this.editing.set(null);
    this.fields = [
      { key: 'fuel', label: 'Fuel', type: 'select', options: this.data.fuelTypes()() },
      { key: 'capacity', label: 'Tank Capacity', type: 'number', required: true, min: 0, value: 30000 },
      { key: 'current', label: 'Current Level', type: 'number', required: true, min: 0, value: 0 },
    ];
    this.open.set(true);
  }

  openEdit(s: StockItem) {
    this.mode.set('edit');
    this.editing.set(s);
    this.fields = [
      { key: 'fuel', label: 'Fuel', type: 'text', value: s.fuel, readonly: true },
      { key: 'capacity', label: 'Tank Capacity', type: 'number', required: true, min: 0, value: s.capacity },
      { key: 'current', label: 'Current Level', type: 'number', required: true, min: 0, value: s.current },
    ];
    this.open.set(true);
  }

  save(v: Record<string, string>) {
    if (this.mode() === 'delivery') {
      this.data.adjustStock(v['fuel'], Number(v['litres']) || 0);
      this.data.log(`Delivery: ${v['litres']}L ${v['fuel']}`);
      this.toast.show('Delivery recorded');
    } else if (this.mode() === 'tank') {
      this.data.add<StockItem>('stock', { fuel: v['fuel'], capacity: Number(v['capacity']) || 0, current: Number(v['current']) || 0 });
      this.toast.show('Tank added');
    } else {
      const cur = this.editing();
      if (cur) this.data.update<StockItem>('stock', cur.id, { capacity: Number(v['capacity']) || 0, current: Number(v['current']) || 0 });
      this.toast.show('Tank updated');
    }
    this.open.set(false);
  }

  async del(s: StockItem) {
    if (await this.confirm.ask(`Delete the ${s.fuel} tank?`)) {
      this.data.remove('stock', s.id);
      this.toast.show('Tank deleted', 'info');
    }
  }
}
