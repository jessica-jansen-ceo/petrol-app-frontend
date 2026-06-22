/** Report Builder domain types (admin feature). */

export type ReportSource = 'sales' | 'expenses' | 'meters' | 'inventory' | 'reconciliation';
export type ReportRange = 'all' | 'today' | 'week' | 'month';

export interface ReportColumn { key: string; label: string; }

/** A saved report template. Run later against live (mock) data. */
export interface ReportTemplate {
  id: string;
  name: string;
  source: ReportSource;
  /** Selected column keys (subset of the source's columns). */
  columns: string[];
  range: ReportRange;
}

/** Metadata describing each data source the builder can report on. */
export const REPORT_SOURCES: Record<ReportSource, { label: string; dated: boolean; columns: ReportColumn[] }> = {
  sales: {
    label: 'Fuel Sales',
    dated: true,
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'fuel', label: 'Fuel' },
      { key: 'litres', label: 'Litres' },
      { key: 'pricePerLitre', label: 'Price/L' },
      { key: 'amount', label: 'Amount' },
      { key: 'operator', label: 'Operator' },
    ],
  },
  expenses: {
    label: 'Expenses',
    dated: true,
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
    ],
  },
  meters: {
    label: 'Meter Readings',
    dated: false,
    columns: [
      { key: 'pump', label: 'Pump' },
      { key: 'fuel', label: 'Fuel' },
      { key: 'opening', label: 'Opening' },
      { key: 'closing', label: 'Closing' },
      { key: 'dispensed', label: 'Dispensed' },
    ],
  },
  inventory: {
    label: 'Inventory',
    dated: false,
    columns: [
      { key: 'fuel', label: 'Fuel' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'current', label: 'Current' },
    ],
  },
  reconciliation: {
    label: 'Sales vs Meter Reconciliation',
    dated: false,
    columns: [
      { key: 'fuel', label: 'Fuel' },
      { key: 'soldLitres', label: 'Sold (L)' },
      { key: 'dispensedLitres', label: 'Dispensed (L)' },
      { key: 'variance', label: 'Variance (L)' },
      { key: 'variancePct', label: 'Variance %' },
      { key: 'flagged', label: 'Flagged' },
    ],
  },
};

export const RANGE_LABELS: Record<ReportRange, string> = {
  all: 'All time',
  today: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
};
