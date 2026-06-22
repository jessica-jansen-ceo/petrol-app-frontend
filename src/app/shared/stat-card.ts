import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat-card">
      <span class="label">{{ label }}</span>
      <span class="value">{{ value }}</span>
      @if (delta !== undefined) {
        <span class="delta" [class.up]="delta >= 0" [class.down]="delta < 0">
          {{ delta >= 0 ? '▲' : '▼' }} {{ abs(delta) }}%
        </span>
      }
    </div>
  `,
  styles: [`
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:.35rem; box-shadow:0 1px 2px rgba(0,0,0,.04); }
    .label { color:var(--text-muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
    .value { font-size:1.6rem; font-weight:700; color:var(--text); }
    .delta { font-size:.8rem; font-weight:600; }
    .delta.up { color:#16a34a; }
    .delta.down { color:#dc2626; }
  `],
})
export class StatCard {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() delta?: number;
  abs(n: number) { return Math.abs(n); }
}
