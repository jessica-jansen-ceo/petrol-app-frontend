import { Component, Input, computed, signal } from '@angular/core';

export interface BarDatum { label: string; value: number; }

/** Lightweight dependency-free SVG bar chart for the dashboard. */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: `
    <div class="chart">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img">
        @for (b of bars(); track b.label) {
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="barW" [attr.height]="b.h"
                rx="4" fill="var(--primary)" />
        }
      </svg>
      <div class="labels">
        @for (b of data; track b.label) { <span>{{ b.label }}</span> }
      </div>
    </div>
  `,
  styles: [`
    .chart { width:100%; }
    svg { width:100%; height:180px; display:block; }
    rect { transition: height .4s ease, y .4s ease; }
    .labels { display:flex; justify-content:space-around; margin-top:.5rem; }
    .labels span { font-size:.75rem; color:var(--text-muted); }
  `],
})
export class BarChart {
  readonly W = 700;
  readonly H = 200;
  readonly gap = 24;

  private readonly _data = signal<BarDatum[]>([]);
  @Input() set data(v: BarDatum[]) { this._data.set(v ?? []); }
  get data() { return this._data(); }

  get barW(): number {
    const n = this._data().length || 1;
    return (this.W - this.gap * (n + 1)) / n;
  }

  readonly bars = computed(() => {
    const data = this._data();
    const max = Math.max(1, ...data.map((d) => d.value));
    return data.map((d, i) => {
      const h = (d.value / max) * (this.H - 20);
      return {
        label: d.label,
        x: this.gap + i * (this.barW + this.gap),
        y: this.H - h,
        h,
      };
    });
  });
}
