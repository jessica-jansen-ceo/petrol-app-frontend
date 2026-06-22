import { Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../core/services/confirm.service';

/** Mounts app-wide toasts + the confirm dialog. Placed once in the shell. */
@Component({
  selector: 'app-overlays',
  standalone: true,
  template: `
    <div class="toasts">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [class.info]="t.kind === 'info'"
             (click)="toast.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>

    @if (confirm.state(); as c) {
      <div class="overlay" (click)="confirm.answer(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <p>{{ c.message }}</p>
          <div class="row">
            <button class="btn-ghost" (click)="confirm.answer(false)">Cancel</button>
            <button class="btn-danger" (click)="confirm.answer(true)">Confirm</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toasts { position: fixed; bottom: 1.25rem; right: 1.25rem; display: flex; flex-direction: column; gap: .5rem; z-index: 80; }
    .toast { background: #16a34a; color: #fff; padding: .65rem 1rem; border-radius: 10px; font-size: .88rem; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.2); cursor: pointer; max-width: 320px; }
    .toast.error { background: #dc2626; }
    .toast.info { background: #2563eb; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: grid; place-items: center; z-index: 90; padding: 1rem; }
    .dialog { background: var(--surface); border-radius: 16px; padding: 1.5rem; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
    p { margin: 0 0 1.25rem; color: var(--text); }
    .row { display: flex; justify-content: flex-end; gap: .5rem; }
    .btn-danger { background: #dc2626; color: #fff; border: none; padding: .55rem .95rem; border-radius: 9px; font-weight: 600; cursor: pointer; }
  `],
})
export class Overlays {
  readonly toast = inject(ToastService);
  readonly confirm = inject(ConfirmService);
}
