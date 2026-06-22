import { CLIENT_CONFIG } from '../config/client.config';

interface Column { key: string; label: string; }
export interface PdfOptions {
  title: string;
  subtitle?: string;
  /** Period/date-range line, e.g. "Last 7 days". */
  period?: string;
  columns: (Column | string)[];
  rows: readonly object[];
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const fmt = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString(CLIENT_CONFIG.locale.code);
  return escapeHtml(String(v));
};

/**
 * Generate a polished, print-ready report and open the print dialog (save as
 * PDF). Pure front-end: writes a styled document into a hidden iframe — no libs
 * or backend. Includes the brand logo/monogram, company, title and timestamp.
 */
export function exportPdf(opts: PdfOptions): void {
  const cols: Column[] = opts.columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : c));
  const brand = CLIENT_CONFIG.brand;
  const primary = brand.primaryColor;
  const generated = new Date().toLocaleString(CLIENT_CONFIG.locale.code);

  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="logo" class="logo-img" />`
    : `<div class="logo-mono">${escapeHtml(brand.appName.charAt(0))}</div>`;

  const head = cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = opts.rows.length
    ? opts.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return `<tr>${cols.map((c) => `<td>${fmt(row[c.key])}</td>`).join('')}</tr>`;
      }).join('')
    : `<tr><td colspan="${cols.length}" class="empty">No data for this report.</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b232c; margin: 0; }
  .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid ${primary}; padding-bottom: 14px; }
  .logo-img { height: 46px; }
  .logo-mono { width: 46px; height: 46px; border-radius: 11px; background: ${primary}; color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; }
  .brand-text { line-height: 1.2; }
  .brand-text .name { font-size: 20px; font-weight: 800; }
  .brand-text .company { font-size: 12px; color: #6b7785; }
  .doc-title { margin-left: auto; text-align: right; }
  .doc-title h1 { font-size: 18px; margin: 0; color: ${primary}; }
  .doc-title .meta { font-size: 11px; color: #6b7785; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 12px; }
  thead th { background: ${primary}; color: #fff; text-align: left; padding: 9px 10px; font-size: 11px;
    text-transform: uppercase; letter-spacing: .04em; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #e3e8ee; }
  tbody tr:nth-child(even) td { background: #f6f8fa; }
  td.empty { text-align: center; color: #6b7785; padding: 30px; }
  .footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e3e8ee;
    font-size: 10px; color: #93a1b0; display: flex; justify-content: space-between; }
</style></head>
<body>
  <div class="header">
    ${logo}
    <div class="brand-text">
      <div class="name">${escapeHtml(brand.appName)}</div>
      <div class="company">${escapeHtml(brand.companyName)}</div>
    </div>
    <div class="doc-title">
      <h1>${escapeHtml(opts.title)}</h1>
      <div class="meta">
        ${opts.period ? `Period: ${escapeHtml(opts.period)}<br/>` : ''}
        ${opts.subtitle ? `${escapeHtml(opts.subtitle)}<br/>` : ''}
        Generated: ${escapeHtml(generated)}
      </div>
    </div>
  </div>

  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>

  <div class="footer">
    <span>${escapeHtml(brand.appName)} — ${escapeHtml(brand.tagline)}</span>
    <span>${escapeHtml(opts.rows.length + ' row(s)')}</span>
  </div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
}
