/** Small client-side export helpers (no backend needed). */

/** Convert rows of objects to a CSV string using the given column order. */
export function toCsv(rows: readonly object[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.join(',');
  const body = rows
    .map((r) => columns.map((c) => esc((r as Record<string, unknown>)[c])).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

/** Trigger a browser download of text content. */
export function download(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
