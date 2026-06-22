import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        @if (subtitle) { <p>{{ subtitle }}</p> }
      </div>
      <div class="actions"><ng-content></ng-content></div>
    </header>
  `,
  styles: [`
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    h1 { margin:0; font-size:1.5rem; font-weight:700; color:var(--text); }
    p { margin:.25rem 0 0; color:var(--text-muted); font-size:.9rem; }
    .actions { display:flex; gap:.5rem; }
  `],
})
export class PageHeader {
  @Input() title = '';
  @Input() subtitle?: string;
}
