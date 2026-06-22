import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  /** Options for `select` fields. */
  options?: string[];
  /** Optional default value. */
  value?: string | number;
}

/**
 * Generic modal with a dynamic field list. Screens supply `fields`; on submit
 * it emits a `{ key: value }` record (numbers parsed). Open state is controlled
 * by the parent via the `open` input.
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
              <span>{{ f.label }}</span>
              @if (f.type === 'select') {
                <select [value]="model()[f.key]" (change)="set(f.key, $any($event.target).value)">
                  @for (o of f.options || []; track o) { <option [value]="o">{{ o }}</option> }
                </select>
              } @else {
                <input [type]="f.type" [value]="model()[f.key]"
                       (input)="set(f.key, $any($event.target).value)" />
              }
            </label>
          }
          <div class="row">
            <button type="button" class="btn-ghost" (click)="onCancel()">Cancel</button>
            <button type="submit" class="btn-primary">Save</button>
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
    input, select { padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; font-size: .95rem; background: var(--bg); color: var(--text); }
    input:focus, select:focus { outline: 2px solid color-mix(in srgb, var(--primary) 50%, transparent); border-color: var(--primary); }
    .row { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .5rem; }
    .btn-ghost { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: .55rem .95rem; border-radius: 9px; font-weight: 600; cursor: pointer; }
  `],
})
export class ModalForm {
  @Input() title = '';
  @Input() open = false;
  @Input() set fields(v: FormField[]) {
    this._fields = v ?? [];
    const init: Record<string, string> = {};
    for (const f of this._fields) init[f.key] = String(f.value ?? (f.type === 'select' ? f.options?.[0] ?? '' : ''));
    this.model.set(init);
  }
  get fields() { return this._fields; }
  private _fields: FormField[] = [];

  @Output() save = new EventEmitter<Record<string, string>>();
  @Output() cancel = new EventEmitter<void>();

  model = signal<Record<string, string>>({});

  set(key: string, value: string) {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  onSubmit(e: Event) {
    e.preventDefault();
    this.save.emit(this.model());
  }

  onCancel() {
    this.cancel.emit();
  }
}
