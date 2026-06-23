/** Shared quick date-range filter used on list screens. */
export type RangeKey = 'all' | 'today' | 'week' | 'month';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7d' },
  { key: 'month', label: '30d' },
  { key: 'all', label: 'All' },
];

/** Inclusive cutoff date (YYYY-MM-DD) for a range, or '' for "all". */
export function rangeCutoff(range: RangeKey): string {
  if (range === 'all') return '';
  const days = range === 'today' ? 0 : range === 'week' ? 6 : 29;
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
}
