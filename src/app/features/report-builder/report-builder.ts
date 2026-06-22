import { Component, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { exportPdf } from '../../shared/pdf';
import {
  ReportRange, ReportSource, ReportTemplate, REPORT_SOURCES, RANGE_LABELS,
} from '../../core/models/report';

@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header title="Reports" subtitle="Build report templates, preview them, and save. Saved reports run against live data.">
      @if (!building()) { <button class="btn-primary" (click)="newReport()">+ New Report</button> }
    </app-page-header>

    <!-- Saved templates -->
    @if (!building()) {
      <div class="panel">
        <h2>Saved Reports</h2>
        @if (templates().length === 0) {
          <div class="empty">No report templates yet. Create one to get started.</div>
        } @else {
          <table class="feature-table">
            <thead><tr><th>Name</th><th>Source</th><th>Range</th><th>Columns</th><th></th></tr></thead>
            <tbody>
              @for (t of templates(); track t.id) {
                <tr>
                  <td>{{ t.name }}</td>
                  <td>{{ sourceLabel(t.source) }}</td>
                  <td>{{ rangeLabel(t.range) }}</td>
                  <td>{{ t.columns.length }}</td>
                  <td><div class="row-actions">
                    <button class="btn-ghost" (click)="exportTemplate(t)">Export PDF</button>
                    <button class="icon-btn" title="Edit" (click)="openEdit(t)">✎</button>
                    <button class="icon-btn danger" title="Delete" (click)="del(t)">🗑</button>
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- Builder -->
    @if (building()) {
      <div class="builder">
        <div class="panel params">
          <h2>{{ editingId() ? 'Edit Report' : 'New Report' }}</h2>
          <label><span>Report name</span>
            <input type="text" [value]="name()" (input)="name.set($any($event.target).value)" placeholder="e.g. Weekly Sales" />
          </label>
          <label><span>Data source</span>
            <select [value]="source()" (change)="changeSource($any($event.target).value)">
              @for (s of sources; track s.key) { <option [value]="s.key">{{ s.label }}</option> }
            </select>
          </label>
          <label><span>Date range</span>
            <select [value]="range()" (change)="range.set($any($event.target).value)" [disabled]="!meta().dated">
              @for (r of ranges; track r.key) { <option [value]="r.key">{{ r.label }}</option> }
            </select>
          </label>
          @if (!meta().dated) { <p class="hint">This source has no dates — range is ignored.</p> }

          <span class="cols-label">Columns</span>
          <div class="cols">
            @for (c of meta().columns; track c.key) {
              <label class="check">
                <input type="checkbox" [checked]="selected().includes(c.key)" (change)="toggle(c.key)" />
                {{ c.label }}
              </label>
            }
          </div>

          <div class="actions">
            <button class="btn-ghost" (click)="cancel()">Cancel</button>
            <button class="btn-ghost" (click)="exportPreview()">Export PDF</button>
            <button class="btn-primary" (click)="save()">Save Report</button>
          </div>
        </div>

        <div class="panel preview">
          <h2>Preview</h2>
          <p class="hint">{{ preview().title || 'Untitled' }} · {{ preview().period }} · {{ preview().rows.length }} row(s)</p>
          @if (preview().columns.length === 0) {
            <div class="empty">Select at least one column.</div>
          } @else {
            <div class="scroll">
              <table class="feature-table">
                <thead><tr>@for (c of preview().columns; track c.key) { <th>{{ c.label }}</th> }</tr></thead>
                <tbody>
                  @for (row of preview().rows; track $index) {
                    <tr>@for (c of preview().columns; track c.key) { <td>{{ row[c.key] }}</td> }</tr>
                  }
                  @if (preview().rows.length === 0) {
                    <tr><td [attr.colspan]="preview().columns.length" class="empty">No data for this range.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 1rem; font-size: 1rem; color: var(--text); }
    .builder { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; align-items: start; }
    label { display: flex; flex-direction: column; gap: .35rem; font-size: .82rem; font-weight: 600; color: var(--text-muted); margin-bottom: .9rem; }
    input[type=text], select { padding: .6rem .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); font-size: .95rem; }
    .hint { margin: 0 0 .9rem; color: var(--text-muted); font-size: .82rem; }
    .cols-label { font-size: .82rem; font-weight: 600; color: var(--text-muted); }
    .cols { display: flex; flex-direction: column; gap: .4rem; margin: .5rem 0 1rem; }
    .check { flex-direction: row; align-items: center; gap: .5rem; font-weight: 500; color: var(--text); margin: 0; }
    .actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .scroll { overflow-x: auto; }
    @media (max-width: 820px) { .builder { grid-template-columns: 1fr; } }
  `],
})
export class ReportBuilder {
  private data = inject(MockDataService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly templates = this.data.reportTemplates();
  readonly sources = (Object.keys(REPORT_SOURCES) as ReportSource[]).map((k) => ({ key: k, label: REPORT_SOURCES[k].label }));
  readonly ranges = (Object.keys(RANGE_LABELS) as ReportRange[]).map((k) => ({ key: k, label: RANGE_LABELS[k] }));

  building = signal(false);
  editingId = signal<string | null>(null);
  name = signal('');
  source = signal<ReportSource>('sales');
  range = signal<ReportRange>('week');
  selected = signal<string[]>([]);

  readonly meta = computed(() => REPORT_SOURCES[this.source()]);
  readonly draft = computed<ReportTemplate>(() => ({
    id: this.editingId() ?? 'draft',
    name: this.name(),
    source: this.source(),
    range: this.range(),
    columns: this.selected(),
  }));
  readonly preview = computed(() => this.data.runReport(this.draft()));

  sourceLabel(s: ReportSource) { return REPORT_SOURCES[s].label; }
  rangeLabel(r: ReportRange) { return RANGE_LABELS[r]; }

  newReport() {
    this.editingId.set(null);
    this.name.set('');
    this.source.set('sales');
    this.range.set('week');
    this.selected.set(REPORT_SOURCES['sales'].columns.map((c) => c.key));
    this.building.set(true);
  }

  openEdit(t: ReportTemplate) {
    this.editingId.set(t.id);
    this.name.set(t.name);
    this.source.set(t.source);
    this.range.set(t.range);
    this.selected.set([...t.columns]);
    this.building.set(true);
  }

  changeSource(s: ReportSource) {
    this.source.set(s);
    this.selected.set(REPORT_SOURCES[s].columns.map((c) => c.key)); // default to all
  }

  toggle(key: string) {
    this.selected.update((cols) => (cols.includes(key) ? cols.filter((k) => k !== key) : [...cols, key]));
  }

  save() {
    if (!this.name().trim()) { this.toast.show('Give the report a name', 'error'); return; }
    if (this.selected().length === 0) { this.toast.show('Select at least one column', 'error'); return; }
    const rec = { name: this.name().trim(), source: this.source(), range: this.range(), columns: this.selected() };
    const id = this.editingId();
    if (id) { this.data.update<ReportTemplate>('reportTemplates', id, rec); this.toast.show('Report updated'); }
    else { this.data.add<ReportTemplate>('reportTemplates', rec); this.toast.show('Report saved'); }
    this.building.set(false);
  }

  cancel() { this.building.set(false); }

  exportPreview() { this.runPdf(this.draft()); }
  exportTemplate(t: ReportTemplate) { this.runPdf(t); }

  private runPdf(t: ReportTemplate) {
    const r = this.data.runReport(t);
    exportPdf({ title: r.title || 'Report', period: r.period, columns: r.columns, rows: r.rows });
  }

  async del(t: ReportTemplate) {
    if (await this.confirm.ask(`Delete report "${t.name}"?`)) {
      this.data.remove('reportTemplates', t.id);
      this.toast.show('Report deleted', 'info');
    }
  }
}
