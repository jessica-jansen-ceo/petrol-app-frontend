import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select';
  /** Options for `select` fields. */
  options?: string[];
  /** Optional default value. */
  value?: string | number;
  required?: boolean;
  /** Minimum for number fields. */
  min?: number;
  step?: number;
  placeholder?: string;
  /** When true the field is shown but cannot be edited. */
  readonly?: boolean;
}

/**
 * Generic modal with a dynamic field list and validation. Screens supply
 * `fields`; on submit it validates (required + min + optional custom rule) and
 * emits a `{ key: value }` record. Open state is controlled by the parent.
 */
@Component({
  selector: 'app-modal-form',
  standalone: true,
  template: `
    @if (open) {
      <div class="overlay" (click)="onCancel()">
        <form class="dialog" (click)="$event.stopPropagation()" (submit)="onSubmit($event)">
          <h2>{{ title }}</h2>
          @for (f of fields; track f.key) {
            <label>
              <span>{{ f.label }}@if (f.required) { <em>*</em> }</span>
              @if (f.type === 'select') {
                <select [value]="model()[f.key]" [disabled]="!!f.readonly"
                        (change)="set(f.key, $any($event.target).value)">
                  @for (o of f.options || []; track o) { <option [value]="o">{{ o }}</option> }
                </select>
              } @else {
                <input [type]="f.type" [value]="model()[f.key]" [readonly]="!!f.readonly"
                       [attr.min]="f.min" [attr.step]="f.step" [attr.placeholder]="f.placeholder"
                       (input)="set(f.key, $any($event.target).value)" />
              }
            </label>
          }
          @if (error()) { <p class="err">{{ error() }}</p> }
          <div class="row">
            <button type="button" class="btn-ghost" (click)="onCancel()">Cancel</button>
            <button type="submit" class="btn-primary">{{ submitLabel }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: grid; place-items: center; z-index: 50; padding: 1rem; }
    .dialog { background: var(--surface); border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: .8rem; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
    h2 { margin: 0 0 .25rem; font-size: 1.15rem; color: var(--text); }
    label { display: flex; flex-direction: column; gap: .3rem; font-size: .82rem; font-weight: 600; color: var(--text-muted); }
    label em { color: #dc2626; font-style: normal; }
    input, select { padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; font-size: .95rem; background: var(--bg); color: var(--text); }
    input[readonly], select[disabled] { opacity: .6; cursor: not-allowed; }
    input:focus, select:focus { outline: 2px solid color-mix(in srgb, var(--primary) 50%, transparent); border-color: var(--primary); }
    .err { margin: 0; color: #dc2626; font-size: .82rem; font-weight: 600; }
    .row { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .5rem; }
    .btn-ghost { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: .55rem .95rem; border-radius: 9px; font-weight: 600; cursor: pointer; }
  `],
})
export class ModalForm {
  @Input() title = '';
  @Input() open = false;
  @Input() submitLabel = 'Save';
  /** Optional cross-field rule; return an error message or null. */
  @Input() validate?: (m: Record<string, string>) => string | null;

  @Input() set fields(v: FormField[]) {
    this._fields = v ?? [];
    const init: Record<string, string> = {};
    for (const f of this._fields) init[f.key] = String(f.value ?? (f.type === 'select' ? f.options?.[0] ?? '' : ''));
    this.model.set(init);
    this.error.set(null);
  }
  get fields() { return this._fields; }
  private _fields: FormField[] = [];

  @Output() save = new EventEmitter<Record<string, string>>();
  @Output() cancel = new EventEmitter<void>();

  model = signal<Record<string, string>>({});
  error = signal<string | null>(null);

  set(key: string, value: string) {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  onSubmit(e: Event) {
    e.preventDefault();
    const m = this.model();
    for (const f of this._fields) {
      const raw = (m[f.key] ?? '').trim();
      if (f.required && !raw) { this.error.set(`${f.label} is required.`); return; }
      if (f.type === 'number' && raw !== '') {
        const n = Number(raw);
        if (Number.isNaN(n)) { this.error.set(`${f.label} must be a number.`); return; }
        if (f.min !== undefined && n < f.min) { this.error.set(`${f.label} must be at least ${f.min}.`); return; }
      }
    }
    const custom = this.validate?.(m);
    if (custom) { this.error.set(custom); return; }
    this.save.emit(m);
  }

  onCancel() {
    this.cancel.emit();
  }
}
