import { Component, Input, computed, signal } from '@angular/core';

export interface StackSegment { key: string; value: number; color: string; }
export interface StackedDatum { label: string; segments: StackSegment[]; }

/** SVG stacked bar chart — each bar split into coloured segments (e.g. by fuel). */
@Component({
  selector: 'app-stacked-bar-chart',
  standalone: true,
  template: `
    <div class="chart">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img">
        @for (bar of bars(); track bar.label) {
          @for (seg of bar.segments; track seg.key) {
            <rect [attr.x]="bar.x" [attr.y]="seg.y" [attr.width]="barW" [attr.height]="seg.h"
                  [attr.fill]="seg.color" />
          }
        }
      </svg>
      <div class="labels">
        @for (d of data(); track d.label) { <span>{{ d.label }}</span> }
      </div>
      <div class="legend">
        @for (l of legend(); track l.key) {
          <span class="key"><i [style.background]="l.color"></i>{{ l.key }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .chart { width: 100%; }
    svg { width: 100%; height: 180px; display: block; }
    rect { transition: height .35s ease, y .35s ease; }
    .labels { display: flex; justify-content: space-around; margin-top: .5rem; }
    .labels span { font-size: .75rem; color: var(--text-muted); }
    .legend { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .75rem; justify-content: center; }
    .key { display: inline-flex; align-items: center; gap: .35rem; font-size: .75rem; color: var(--text-muted); }
    .key i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  `],
})
export class StackedBarChart {
  readonly W = 700;
  readonly H = 200;
  readonly gap = 24;

  readonly data = signal<StackedDatum[]>([]);
  @Input('data') set dataInput(v: StackedDatum[]) { this.data.set(v ?? []); }

  get barW(): number {
    const n = this.data().length || 1;
    return (this.W - this.gap * (n + 1)) / n;
  }

  readonly bars = computed(() => {
    const data = this.data();
    const max = Math.max(1, ...data.map((d) => d.segments.reduce((a, s) => a + s.value, 0)));
    return data.map((d, i) => {
      let cursor = this.H;
      const segments = d.segments.map((s) => {
        const h = (s.value / max) * (this.H - 20);
        cursor -= h;
        return { key: s.key, color: s.color, y: cursor, h };
      });
      return { label: d.label, x: this.gap + i * (this.barW + this.gap), segments };
    });
  });

  readonly legend = computed(() => {
    const seen = new Map<string, string>();
    for (const d of this.data()) for (const s of d.segments) if (!seen.has(s.key)) seen.set(s.key, s.color);
    return [...seen.entries()].map(([key, color]) => ({ key, color }));
  });
}
