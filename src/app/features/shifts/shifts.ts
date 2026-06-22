import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { ModalForm, FormField } from '../../shared/modal-form';
import { MockDataService, Shift } from '../../core/services/mock-data.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [PageHeader, ModalForm],
  template: `
    <app-page-header title="Shifts" subtitle="Schedule and attendance. Operators clock only their own shift; managers manage all.">
      <button class="btn-primary" (click)="openCreate()">+ Open Shift</button>
    </app-page-header>

    <div class="panel">
      @if (shifts().length === 0) {
        <div class="empty">No shifts scheduled.</div>
      } @else {
        <table class="feature-table">
          <thead><tr><th>Operator</th><th>Pump</th><th>Scheduled</th><th>Clock In</th><th>Clock Out</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (s of shifts(); track s.id) {
              <tr>
                <td>{{ s.operator }}</td><td>{{ s.pump }}</td>
                <td>{{ s.scheduledStart }}–{{ s.scheduledEnd }}</td>
                <td>{{ s.clockIn || '—' }}</td><td>{{ s.clockOut || '—' }}</td>
                <td><span class="badge" [class.active]="s.status === 'Active'" [class.warn]="s.status === 'Scheduled'">{{ s.status }}</span></td>
                <td><div class="row-actions">
                  @if (s.status === 'Scheduled' && perms.canManageShift(s)) { <button class="btn-ghost" (click)="clockIn(s)">Clock In</button> }
                  @if (s.status === 'Active' && perms.canManageShift(s)) { <button class="btn-ghost" (click)="clockOut(s)">Clock Out</button> }
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

    <app-modal-form [title]="editing() ? 'Edit Shift' : 'Open Shift'" [open]="open()" [fields]="fields"
      (cancel)="open.set(false)" (save)="save($event)"></app-modal-form>
  `,
})
export class Shifts {
  private data = inject(MockDataService);
  readonly perms = inject(PermissionsService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly shifts = this.data.shifts();
  open = signal(false);
  editing = signal<Shift | null>(null);
  fields: FormField[] = [];

  private operatorField(value?: string): FormField {
    // Operators can only open their OWN shift, so the field is locked to them.
    if (this.perms.isSupervisor()) {
      const names = this.data.employees()().map((e) => e.name);
      return { key: 'operator', label: 'Operator', type: 'select', options: names.length ? names : ['—'], value };
    }
    return { key: 'operator', label: 'Operator', type: 'text', value: value ?? this.auth.user()?.displayName ?? '', readonly: true };
  }

  private buildFields(s?: Shift): FormField[] {
    return [
      this.operatorField(s?.operator),
      { key: 'pump', label: 'Pump', type: 'select', options: ['Pump 1', 'Pump 2', 'Pump 3', 'Pump 4', 'Office'], value: s?.pump },
      { key: 'scheduledStart', label: 'Scheduled Start', type: 'time', value: s?.scheduledStart ?? '06:00' },
      { key: 'scheduledEnd', label: 'Scheduled End', type: 'time', value: s?.scheduledEnd ?? '14:00' },
    ];
  }

  openCreate() { this.editing.set(null); this.fields = this.buildFields(); this.open.set(true); }
  openEdit(s: Shift) { this.editing.set(s); this.fields = this.buildFields(s); this.open.set(true); }

  save(v: Record<string, string>) {
    // Enforce ownership: operators cannot open a shift for someone else.
    const operator = this.perms.isSupervisor() ? v['operator'] : (this.auth.user()?.displayName ?? v['operator']);
    const rec = { operator, pump: v['pump'], scheduledStart: v['scheduledStart'], scheduledEnd: v['scheduledEnd'] };
    const cur = this.editing();
    if (cur) {
      this.data.update<Shift>('shifts', cur.id, rec);
      this.toast.show('Shift updated');
    } else {
      this.data.add<Shift>('shifts', { ...rec, status: 'Scheduled' });
      this.data.log(`Opened shift for ${operator}`);
      this.toast.show('Shift opened');
    }
    this.open.set(false);
  }

  clockIn(s: Shift) {
    if (!this.perms.canManageShift(s)) { this.toast.show("You can only clock your own shift.", 'error'); return; }
    this.data.clockIn(s.id);
    this.toast.show(`${s.operator} clocked in`);
  }

  clockOut(s: Shift) {
    if (!this.perms.canManageShift(s)) { this.toast.show("You can only clock your own shift.", 'error'); return; }
    this.data.clockOut(s.id);
    this.toast.show(`${s.operator} clocked out`);
  }

  async del(s: Shift) {
    if (await this.confirm.ask(`Delete ${s.operator}'s shift?`)) {
      this.data.remove('shifts', s.id);
      this.toast.show('Shift deleted', 'info');
    }
  }
}
