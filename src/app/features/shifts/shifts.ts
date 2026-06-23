import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, Shift, Nozzle } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

type Action = 'shift' | 'clockin' | 'cashup';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [PageHeader, ModalForm, MoneyPipe],
  template: `
    <app-page-header title="Shifts" subtitle="Schedule, attendance and cash-up. Operators clock only their own shift; managers manage all.">
      <button class="btn-primary" (click)="openCreate()">+ Open Shift</button>
    </app-page-header>

    <div class="panel">
      @if (shifts().length === 0) {
        <div class="empty">No shifts scheduled.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Operator</th><th>Pump</th><th>Scheduled</th><th>In</th><th>Out</th><th>Status</th>
            <th>Expected</th><th>Declared</th><th>Over / Short</th><th></th></tr></thead>
          <tbody>
            @for (s of shifts(); track s.id) {
              <tr>
                <td>{{ s.operator }}</td><td>{{ s.pump }}</td>
                <td>{{ s.scheduledStart }}–{{ s.scheduledEnd }}</td>
                <td>{{ s.clockIn || '—' }}</td><td>{{ s.clockOut || '—' }}</td>
                <td><span class="badge" [class.active]="s.status === 'Active'" [class.warn]="s.status === 'Scheduled'">{{ s.status }}</span></td>
                <td>{{ s.status === 'Closed' ? (s.expectedAmount | money) : '—' }}</td>
                <td>{{ s.status === 'Closed' ? (s.declaredCash | money) : '—' }}</td>
                <td>
                  @if (s.status === 'Closed') {
                    <span class="badge" [class.active]="variance(s) >= 0" [class.warn]="variance(s) < 0">
                      {{ variance(s) >= 0 ? 'Over ' : 'Short ' }}{{ abs(variance(s)) | money }}
                    </span>
                  } @else { — }
                </td>
                <td><div class="row-actions">
                  @if (s.status === 'Scheduled' && perms.canManageShift(s)) { <button class="btn-ghost" (click)="doClockIn(s)">Clock In</button> }
                  @if (s.status === 'Active' && perms.canManageShift(s)) { <button class="btn-ghost" (click)="doClockOut(s)">Cash-up</button> }
                  @if (perms.isSupervisor()) {
                    <button class="icon-btn" title="Edit" (click)="openEdit(s)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(s)">🗑</button>
                  }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-modal-form [title]="modalTitle()" [submitLabel]="action() === 'cashup' ? 'Close & Cash-up' : (action() === 'clockin' ? 'Clock In' : 'Save')"
      [open]="open()" [fields]="fields" (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Shifts {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly shifts = this.data.viewShifts;
  open = signal(false);
  action = signal<Action>('shift');
  editing = signal<Shift | null>(null);
  fields: FormField[] = [];
  private current: Shift | null = null;
  private nozzles: Nozzle[] = [];

  variance(s: Shift) { return Math.round(((s.declaredCash ?? 0) - (s.expectedAmount ?? 0)) * 100) / 100; }
  abs(n: number) { return Math.abs(n); }
  modalTitle() {
    if (this.action() === 'clockin') return `Clock In — ${this.current?.operator}`;
    if (this.action() === 'cashup') return `Cash-up — ${this.current?.operator}`;
    return this.editing() ? 'Edit Shift' : 'Open Shift';
  }

  private operatorField(value?: string): FormField {
    if (this.perms.isSupervisor()) {
      const names = this.data.employees()().map((e) => e.name);
      return { key: 'operator', label: 'Operator', type: 'select', options: names.length ? names : ['—'], value };
    }
    return { key: 'operator', label: 'Operator', type: 'text', value: value ?? this.auth.user()?.displayName ?? '', readonly: true };
  }

  private buildFields(s?: Shift): FormField[] {
    return [
      { key: 'station', label: 'Station', type: 'select', options: this.data.stationNames(), value: s ? this.data.stationName(s.stationId) : this.data.defaultStationName() },
      this.operatorField(s?.operator),
      { key: 'pump', label: 'Pump', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4', 'Office'], value: s?.pump },
      { key: 'scheduledStart', label: 'Scheduled Start', type: 'time', value: s?.scheduledStart ?? '06:00' },
      { key: 'scheduledEnd', label: 'Scheduled End', type: 'time', value: s?.scheduledEnd ?? '14:00' },
    ];
  }

  openCreate() { this.action.set('shift'); this.editing.set(null); this.fields = this.buildFields(); this.open.set(true); }
  openEdit(s: Shift) { this.action.set('shift'); this.editing.set(s); this.fields = this.buildFields(s); this.open.set(true); }

  doClockIn(s: Shift) {
    if (!this.perms.canManageShift(s)) { this.toast.show('You can only clock your own shift.', 'error'); return; }
    this.nozzles = this.data.nozzlesForPump(s.stationId, s.pump);
    if (this.nozzles.length === 0) { this.data.clockInWithReadings(s.id, {}); this.toast.show(`${s.operator} clocked in`); return; }
    this.current = s;
    this.action.set('clockin');
    this.fields = this.nozzles.map((n) => ({
      key: n.id, label: `${n.dispenser} ${n.label} · ${n.fuel} — opening`, type: 'number', required: true, min: 0,
      value: this.data.latestTotalizer(n.id),
    }));
    this.open.set(true);
  }

  doClockOut(s: Shift) {
    if (!this.perms.canManageShift(s)) { this.toast.show('You can only clock your own shift.', 'error'); return; }
    this.nozzles = this.data.nozzlesForPump(s.stationId, s.pump);
    this.current = s;
    this.action.set('cashup');
    this.fields = [
      ...this.nozzles.map((n) => ({
        key: n.id, label: `${n.dispenser} ${n.label} · ${n.fuel} — closing`, type: 'number' as const, required: true, min: 0,
        value: s.openingReadings?.[n.id] ?? this.data.latestTotalizer(n.id),
      })),
      { key: 'declaredCash', label: 'Cash declared', type: 'number', required: true, min: 0, value: 0 },
    ];
    this.open.set(true);
  }

  save(v: Record<string, string>) {
    if (this.action() === 'clockin' && this.current) {
      const readings = Object.fromEntries(this.nozzles.map((n) => [n.id, Number(v[n.id]) || 0]));
      this.data.clockInWithReadings(this.current.id, readings);
      this.toast.show(`${this.current.operator} clocked in`);
    } else if (this.action() === 'cashup' && this.current) {
      const closing = Object.fromEntries(this.nozzles.map((n) => [n.id, Number(v[n.id]) || 0]));
      this.data.cashUp(this.current.id, closing, Number(v['declaredCash']) || 0);
      this.toast.show(`${this.current.operator} cashed up`);
    } else {
      const operator = this.perms.isSupervisor() ? v['operator'] : (this.auth.user()?.displayName ?? v['operator']);
      const rec = { stationId: this.data.stationIdByName(v['station']), operator, pump: v['pump'], scheduledStart: v['scheduledStart'], scheduledEnd: v['scheduledEnd'] };
      const cur = this.editing();
      if (cur) { this.data.update<Shift>('shifts', cur.id, rec); this.toast.show('Shift updated'); }
      else { this.data.add<Shift>('shifts', { ...rec, status: 'Scheduled' }); this.data.log(`Opened shift for ${operator}`); this.toast.show('Shift opened'); }
    }
    this.open.set(false);
  }

  async del(s: Shift) {
    if (await this.confirm.ask(`Delete ${s.operator}'s shift?`)) {
      this.data.remove('shifts', s.id);
      this.toast.show('Shift deleted', 'info');
    }
  }
}
