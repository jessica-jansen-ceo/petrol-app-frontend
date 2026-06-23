import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
import { ReportColumn, ReportSource, ReportTemplate, REPORT_SOURCES, RANGE_LABELS } from '../models/report';

/** Every persisted record carries a stable id. */
export interface Entity { id: string; }

export interface Station extends Entity { name: string; code: string; }
export interface Nozzle extends Entity { stationId: string; dispenser: string; label: string; fuel: string; }

/**
 * Append-only meter ledger entry — a cumulative totalizer reading at a moment
 * in time. These are NEVER edited or deleted: dispensed volume is *derived*
 * from the difference between consecutive readings, which makes silent
 * tampering impossible and yields a reliable audit trail.
 */
export interface MeterEntry extends Entity {
  stationId: string;
  nozzleId: string;
  totalizer: number;
  recordedAt: string; // ISO datetime
  recordedBy: string;
  note?: string;
}

export interface FuelSale extends Entity {
  stationId: string;
  date: string;
  fuel: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  operator: string;
}
export interface Expense extends Entity {
  stationId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}
export interface StockItem extends Entity {
  stationId: string;
  fuel: string;
  capacity: number;
  current: number;
}
export interface Employee extends Entity {
  stationId: string;
  name: string;
  role: string;
  shift: string;
  phone: string;
}
export type ShiftStatus = 'Scheduled' | 'Active' | 'Closed';
export interface Shift extends Entity {
  stationId: string;
  operator: string;
  pump: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  clockIn?: string;
  clockOut?: string;
}
export interface Price extends Entity { fuel: string; pricePerLitre: number; }
export interface Activity extends Entity { time: string; user: string; action: string; }

export type CollectionName =
  | 'stations' | 'nozzles' | 'fuelSales' | 'meterEntries' | 'expenses' | 'stock'
  | 'employees' | 'shifts' | 'prices' | 'activity' | 'reportTemplates';

export const ALL_STATIONS = 'all';

const KEY = (name: string) => `${CLIENT_CONFIG.clientId}.data.${name}`;
const FUEL_KEY = KEY('fuelTypes');
const FUEL_COLORS_KEY = KEY('fuelColors');
const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now());

const FUEL_PALETTE = [
  '#0f766e', '#f59e0b', '#2563eb', '#dc2626', '#7c3aed',
  '#059669', '#db2777', '#0891b2', '#ca8a04', '#4f46e5',
];

/**
 * Front-end store. Persisted to localStorage, exposed as signals, synced across
 * tabs via the `storage` event. Multi-station aware: most collections carry a
 * `stationId`, and station-scoped *view* selectors honour the current station.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private auth = inject(AuthService);
  private settings = inject(SettingsService);

  private readonly cols: Partial<Record<CollectionName, WritableSignal<Entity[]>>> = {};

  private readonly _stations = this.persisted<Station>('stations', SEED.stations);
  private readonly _nozzles = this.persisted<Nozzle>('nozzles', SEED.nozzles);
  private readonly _fuelSales = this.persisted<FuelSale>('fuelSales', SEED.sales);
  private readonly _meterEntries = this.persisted<MeterEntry>('meterEntries', SEED.meters);
  private readonly _expenses = this.persisted<Expense>('expenses', SEED.expenses);
  private readonly _stock = this.persisted<StockItem>('stock', SEED.stock);
  private readonly _employees = this.persisted<Employee>('employees', SEED.employees);
  private readonly _shifts = this.persisted<Shift>('shifts', SEED.shifts);
  private readonly _prices = this.persisted<Price>('prices', SEED.prices);
  private readonly _activity = this.persisted<Activity>('activity', []);
  private readonly _reportTemplates = this.persisted<ReportTemplate>('reportTemplates', SEED_REPORTS);
  private readonly _fuelTypes = signal<string[]>(this.loadFuelTypes());
  private readonly _fuelColors = signal<Record<string, string>>(this.loadFuelColors());

  constructor() {
    window.addEventListener('storage', (e) => this.onExternalChange(e));
  }

  // ─── Raw reads ───
  stations(): Signal<Station[]> { return this._stations; }
  nozzles(): Signal<Nozzle[]> { return this._nozzles; }
  fuelSales(): Signal<FuelSale[]> { return this._fuelSales; }
  meterEntries(): Signal<MeterEntry[]> { return this._meterEntries; }
  expenses(): Signal<Expense[]> { return this._expenses; }
  stock(): Signal<StockItem[]> { return this._stock; }
  employees(): Signal<Employee[]> { return this._employees; }
  shifts(): Signal<Shift[]> { return this._shifts; }
  prices(): Signal<Price[]> { return this._prices; }
  activity(): Signal<Activity[]> { return this._activity; }
  reportTemplates(): Signal<ReportTemplate[]> { return this._reportTemplates; }
  fuelTypes(): Signal<string[]> { return this._fuelTypes; }
  fuelColors(): Signal<Record<string, string>> { return this._fuelColors; }

  // ─── Station scope ───
  private matchStation = (stationId: string) => {
    const cur = this.settings.currentStation();
    return cur === ALL_STATIONS || stationId === cur;
  };
  stationName(id: string): string {
    return this._stations().find((s) => s.id === id)?.name ?? '—';
  }
  stationNames(): string[] { return this._stations().map((s) => s.name); }
  stationIdByName(name: string): string { return this._stations().find((s) => s.name === name)?.id ?? ''; }
  /** The station to default a new record to: the current one, or the first. */
  defaultStationId(): string {
    const cur = this.settings.currentStation();
    return cur !== ALL_STATIONS ? cur : (this._stations()[0]?.id ?? '');
  }
  defaultStationName(): string { return this.stationName(this.defaultStationId()); }
  /** Nozzles for the current station scope. */
  readonly viewNozzles = computed(() => this._nozzles().filter((n) => this.matchStation(n.stationId)));
  readonly viewSales = computed(() => this._fuelSales().filter((s) => this.matchStation(s.stationId)));
  readonly viewExpenses = computed(() => this._expenses().filter((e) => this.matchStation(e.stationId)));
  readonly viewStock = computed(() => this._stock().filter((s) => this.matchStation(s.stationId)));
  readonly viewEmployees = computed(() => this._employees().filter((e) => this.matchStation(e.stationId)));
  readonly viewShifts = computed(() => this._shifts().filter((s) => this.matchStation(s.stationId)));

  // ─── Generic CRUD ───
  add<T extends Entity>(name: CollectionName, item: Omit<T, 'id'>): T {
    const full = { ...item, id: newId() } as unknown as T;
    const sig = this.cols[name]!;
    this.commit(name, [full, ...sig()]);
    return full;
  }
  update<T extends Entity>(name: CollectionName, id: string, patch: Partial<T>): void {
    const sig = this.cols[name]!;
    this.commit(name, sig().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  remove(name: CollectionName, id: string): void {
    const sig = this.cols[name]!;
    this.commit(name, sig().filter((r) => r.id !== id));
  }

  // ─── Pricing & sales ───
  priceFor(fuel: string): number {
    return this._prices().find((p) => p.fuel === fuel)?.pricePerLitre ?? 0;
  }
  recordSale(input: { stationId: string; date: string; fuel: string; litres: number; operator: string }): FuelSale {
    const pricePerLitre = this.priceFor(input.fuel);
    const amount = Math.round(input.litres * pricePerLitre * 100) / 100;
    const sale = this.add<FuelSale>('fuelSales', { ...input, pricePerLitre, amount });
    this.adjustStock(input.stationId, input.fuel, -input.litres);
    this.log(`Recorded sale: ${input.litres}L ${input.fuel}`);
    return sale;
  }
  editSale(id: string, input: { stationId: string; date: string; fuel: string; litres: number; operator: string }): void {
    const old = this._fuelSales().find((s) => s.id === id);
    if (!old) return;
    this.adjustStock(old.stationId, old.fuel, old.litres);
    const pricePerLitre = this.priceFor(input.fuel);
    const amount = Math.round(input.litres * pricePerLitre * 100) / 100;
    this.update<FuelSale>('fuelSales', id, { ...input, pricePerLitre, amount });
    this.adjustStock(input.stationId, input.fuel, -input.litres);
    this.log(`Edited sale ${id.slice(0, 6)}`);
  }
  deleteSale(id: string): void {
    const old = this._fuelSales().find((s) => s.id === id);
    if (old) this.adjustStock(old.stationId, old.fuel, old.litres);
    this.remove('fuelSales', id);
    this.log(`Deleted sale ${id.slice(0, 6)}`);
  }
  setPrice(fuel: string, pricePerLitre: number): void {
    const existing = this._prices().find((p) => p.fuel === fuel);
    if (existing) this.update<Price>('prices', existing.id, { pricePerLitre });
    else this.add<Price>('prices', { fuel, pricePerLitre });
    this.log(`Set price: ${fuel} = ${pricePerLitre}`);
  }

  // ─── Stock ───
  adjustStock(stationId: string, fuel: string, deltaLitres: number): void {
    const item = this._stock().find((s) => s.stationId === stationId && s.fuel === fuel);
    if (!item) return;
    const next = Math.min(item.capacity, Math.max(0, item.current + deltaLitres));
    this.update<StockItem>('stock', item.id, { current: next });
  }

  // ─── Immutable meter ledger ───
  /** Append a reading. Never edited/deleted — corrections are new entries. */
  addMeterEntry(input: { nozzleId: string; totalizer: number; note?: string }): MeterEntry {
    const nozzle = this._nozzles().find((n) => n.id === input.nozzleId);
    const entry = this.add<MeterEntry>('meterEntries', {
      stationId: nozzle?.stationId ?? '',
      nozzleId: input.nozzleId,
      totalizer: input.totalizer,
      recordedAt: new Date().toISOString(),
      recordedBy: this.auth.user()?.displayName ?? 'System',
      note: input.note,
    });
    this.log(`Meter reading: ${nozzle?.dispenser} ${nozzle?.label} @ ${input.totalizer}`);
    return entry;
  }

  /** Ledger rows for the current station, newest first, with derived deltas. */
  ledgerView(): { entry: MeterEntry; nozzle?: Nozzle; delta: number | null; anomaly: boolean }[] {
    const entries = this._meterEntries().filter((e) => this.matchStation(e.stationId));
    const byNozzle = new Map<string, MeterEntry[]>();
    for (const e of this._meterEntries()) {
      const list = byNozzle.get(e.nozzleId) ?? [];
      list.push(e);
      byNozzle.set(e.nozzleId, list);
    }
    for (const list of byNozzle.values()) list.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    return entries
      .slice()
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((entry) => {
        const list = byNozzle.get(entry.nozzleId)!;
        const idx = list.findIndex((e) => e.id === entry.id);
        const prev = idx > 0 ? list[idx - 1] : null;
        const delta = prev ? entry.totalizer - prev.totalizer : null;
        return { entry, nozzle: this._nozzles().find((n) => n.id === entry.nozzleId), delta, anomaly: delta !== null && delta < 0 };
      });
  }

  /** Litres dispensed per fuel (sum of positive totalizer deltas), station-scoped. */
  private dispensedByFuel(): Map<string, number> {
    const out = new Map<string, number>();
    const nozzles = this._nozzles();
    for (const nozzle of nozzles) {
      if (!this.matchStation(nozzle.stationId)) continue;
      const readings = this._meterEntries()
        .filter((e) => e.nozzleId === nozzle.id)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      let dispensed = 0;
      for (let i = 1; i < readings.length; i++) {
        dispensed += Math.max(0, readings[i].totalizer - readings[i - 1].totalizer);
      }
      out.set(nozzle.fuel, (out.get(nozzle.fuel) ?? 0) + dispensed);
    }
    return out;
  }

  // ─── Reconciliation (sales vs meter deltas) ───
  reconciliation(): {
    fuel: string; soldLitres: number; dispensedLitres: number;
    variance: number; variancePct: number; flagged: boolean;
  }[] {
    const tol = this.settings.reconTolerancePct();
    const dispensed = this.dispensedByFuel();
    const sold = new Map<string, number>();
    for (const s of this.viewSales()) sold.set(s.fuel, (sold.get(s.fuel) ?? 0) + s.litres);
    const fuels = new Set<string>([...sold.keys(), ...dispensed.keys()]);
    return [...fuels].map((fuel) => {
      const soldLitres = Math.round((sold.get(fuel) ?? 0) * 100) / 100;
      const dispensedLitres = Math.round((dispensed.get(fuel) ?? 0) * 100) / 100;
      const variance = Math.round((soldLitres - dispensedLitres) * 100) / 100;
      const variancePct = dispensedLitres ? Math.round((variance / dispensedLitres) * 1000) / 10 : 0;
      return { fuel, soldLitres, dispensedLitres, variance, variancePct, flagged: Math.abs(variancePct) > tol };
    });
  }

  // ─── Dashboard ───
  summary() {
    const sales = this.viewSales();
    const today = todayISO();
    const todaySales = sales.filter((s) => s.date === today).reduce((a, s) => a + s.amount, 0);
    const litresSold = sales.filter((s) => s.date === today).reduce((a, s) => a + s.litres, 0);
    const yesterday = sales.filter((s) => s.date < today).reduce((a, s) => a + s.amount, 0);
    const activeShifts = this.viewShifts().filter((s) => s.status === 'Active').length;
    const threshold = this.settings.lowStockPct();
    const lowStockAlerts = this.viewStock().filter((s) => s.current / s.capacity < threshold).length;
    const salesDelta = yesterday ? Math.round(((todaySales - yesterday) / yesterday) * 1000) / 10 : 0;
    return { todaySales, litresSold, activeShifts, lowStockAlerts, salesDelta };
  }

  /** Tanks (current station scope) below the low-stock threshold. */
  lowStockTanks(): { item: StockItem; pct: number }[] {
    const threshold = this.settings.lowStockPct();
    return this.viewStock()
      .map((item) => ({ item, pct: Math.round((item.current / item.capacity) * 100) }))
      .filter((t) => t.pct / 100 < threshold)
      .sort((a, b) => a.pct - b.pct);
  }

  /** Currently-active shifts in the current station scope. */
  onShiftNow(): Shift[] {
    return this.viewShifts().filter((s) => s.status === 'Active');
  }

  weeklyRevenueStacked(): { label: string; segments: { key: string; value: number; color: string }[] }[] {
    const sales = this.viewSales();
    const fuels = this._fuelTypes();
    const out: { label: string; segments: { key: string; value: number; color: string }[] }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const segments = fuels.map((fuel) => ({
        key: fuel,
        value: sales.filter((s) => s.date === iso && s.fuel === fuel).reduce((a, s) => a + s.amount, 0),
        color: this.colorFor(fuel),
      })).filter((s) => s.value > 0);
      out.push({ label, segments });
    }
    return out;
  }

  fuelMix(): { label: string; value: number; color: string }[] {
    const map = new Map<string, number>();
    for (const s of this.viewSales()) map.set(s.fuel, (map.get(s.fuel) ?? 0) + s.litres);
    return [...map.entries()].map(([label, value]) => ({ label, value, color: this.colorFor(label) }));
  }

  // ─── Report Builder ───
  runReport(t: ReportTemplate): { title: string; period: string; columns: ReportColumn[]; rows: Record<string, unknown>[] } {
    const meta = REPORT_SOURCES[t.source];
    let rows: Record<string, unknown>[] = this.sourceRows(t.source);
    let period = 'All time';
    if (meta.dated && t.range !== 'all') {
      const cutoff = rangeCutoff(t.range);
      rows = rows.filter((r) => String(r['date']) >= cutoff);
      period = RANGE_LABELS[t.range];
    }
    const columns = meta.columns.filter((c) => t.columns.includes(c.key));
    const projected = rows.map((r) => Object.fromEntries(columns.map((c) => [c.key, r[c.key]])));
    return { title: t.name, period, columns, rows: projected };
  }
  private sourceRows(source: ReportSource): Record<string, unknown>[] {
    switch (source) {
      case 'sales': return this.viewSales() as unknown as Record<string, unknown>[];
      case 'expenses': return this.viewExpenses() as unknown as Record<string, unknown>[];
      case 'meters': return this.ledgerRows();
      case 'inventory': return this.viewStock() as unknown as Record<string, unknown>[];
      case 'reconciliation': return this.reconciliation() as unknown as Record<string, unknown>[];
    }
  }
  private ledgerRows(): Record<string, unknown>[] {
    return this.ledgerView().map((r) => ({
      dispenser: r.nozzle?.dispenser, nozzle: r.nozzle?.label, fuel: r.nozzle?.fuel,
      totalizer: r.entry.totalizer, dispensed: r.delta ?? '', recordedAt: r.entry.recordedAt.slice(0, 16).replace('T', ' '),
      recordedBy: r.entry.recordedBy,
    }));
  }

  // ─── Fuel types & colours ───
  colorFor(fuel: string): string { return this._fuelColors()[fuel] ?? 'var(--primary)'; }
  setFuelColor(fuel: string, color: string): void { this.setFuelColors({ ...this._fuelColors(), [fuel]: color }); }
  private nextColor(): string {
    const used = new Set(Object.values(this._fuelColors()));
    return FUEL_PALETTE.find((c) => !used.has(c)) ?? FUEL_PALETTE[used.size % FUEL_PALETTE.length];
  }
  addFuelType(name: string): boolean {
    const clean = name.trim();
    if (!clean || this._fuelTypes().some((t) => t.toLowerCase() === clean.toLowerCase())) return false;
    this.setFuelTypes([...this._fuelTypes(), clean]);
    this.setFuelColor(clean, this.nextColor());
    this.log(`Added fuel type: ${clean}`);
    return true;
  }
  fuelUsage(name: string): { sales: number; nozzles: number; tanks: number; prices: number } {
    return {
      sales: this._fuelSales().filter((s) => s.fuel === name).length,
      nozzles: this._nozzles().filter((n) => n.fuel === name).length,
      tanks: this._stock().filter((s) => s.fuel === name).length,
      prices: this._prices().filter((p) => p.fuel === name).length,
    };
  }
  renameFuelType(oldName: string, newName: string): boolean {
    const clean = newName.trim();
    if (!clean || oldName === clean || this._fuelTypes().some((t) => t.toLowerCase() === clean.toLowerCase())) return false;
    this.setFuelTypes(this._fuelTypes().map((t) => (t === oldName ? clean : t)));
    const rename = (name: CollectionName, sig: WritableSignal<Entity[]>) =>
      this.commit(name, sig().map((r) => ((r as unknown as { fuel?: string }).fuel === oldName ? { ...r, fuel: clean } : r)));
    rename('fuelSales', this._fuelSales as unknown as WritableSignal<Entity[]>);
    rename('nozzles', this._nozzles as unknown as WritableSignal<Entity[]>);
    rename('stock', this._stock as unknown as WritableSignal<Entity[]>);
    rename('prices', this._prices as unknown as WritableSignal<Entity[]>);
    const colors = { ...this._fuelColors() };
    if (colors[oldName]) { colors[clean] = colors[oldName]; delete colors[oldName]; }
    this.setFuelColors(colors);
    this.log(`Renamed fuel: ${oldName} → ${clean}`);
    return true;
  }
  removeFuelType(name: string): void {
    this.commit('fuelSales', this._fuelSales().filter((s) => s.fuel !== name));
    this.commit('nozzles', this._nozzles().filter((n) => n.fuel !== name));
    this.commit('stock', this._stock().filter((s) => s.fuel !== name));
    this.commit('prices', this._prices().filter((p) => p.fuel !== name));
    this.setFuelTypes(this._fuelTypes().filter((t) => t !== name));
    const colors = { ...this._fuelColors() };
    delete colors[name];
    this.setFuelColors(colors);
    this.log(`Removed fuel "${name}" and all associated data`);
  }

  // ─── Stations & nozzles (cascade) ───
  removeStation(id: string): void {
    this.commit('nozzles', this._nozzles().filter((n) => n.stationId !== id));
    this.commit('meterEntries', this._meterEntries().filter((m) => m.stationId !== id));
    this.commit('fuelSales', this._fuelSales().filter((s) => s.stationId !== id));
    this.commit('stock', this._stock().filter((s) => s.stationId !== id));
    this.commit('expenses', this._expenses().filter((e) => e.stationId !== id));
    this.commit('shifts', this._shifts().filter((s) => s.stationId !== id));
    this.commit('employees', this._employees().filter((e) => e.stationId !== id));
    this.commit('stations', this._stations().filter((s) => s.id !== id));
    this.log('Removed station and all associated data');
  }
  removeNozzle(id: string): void {
    this.commit('meterEntries', this._meterEntries().filter((m) => m.nozzleId !== id));
    this.commit('nozzles', this._nozzles().filter((n) => n.id !== id));
    this.log('Removed nozzle and its ledger entries');
  }

  // ─── Shifts ───
  clockIn(id: string): void { this.update<Shift>('shifts', id, { status: 'Active', clockIn: nowTime() }); this.log(`Clocked in shift ${id.slice(0, 6)}`); }
  clockOut(id: string): void { this.update<Shift>('shifts', id, { status: 'Closed', clockOut: nowTime() }); this.log(`Clocked out shift ${id.slice(0, 6)}`); }

  // ─── Activity ───
  log(action: string): void {
    const entry: Activity = { id: newId(), time: new Date().toISOString(), user: this.auth.user()?.displayName ?? 'System', action };
    this.commit('activity', [entry, ...this._activity()].slice(0, 200));
  }

  // ─── Demo data control ───
  loadMockData(): void {
    const seed = buildSeed();
    this.commit('stations', seed.stations);
    this.commit('nozzles', seed.nozzles);
    this.commit('fuelSales', seed.sales);
    this.commit('meterEntries', seed.meters);
    this.commit('expenses', seed.expenses);
    this.commit('stock', seed.stock);
    this.commit('employees', seed.employees);
    this.commit('shifts', seed.shifts);
    this.commit('prices', seed.prices);
    this.commit('reportTemplates', clone(SEED_REPORTS));
    this.setFuelTypes([...SEED_FUEL_TYPES]);
    this.setFuelColors({ ...SEED_FUEL_COLORS });
    this.log('Loaded demo data');
  }
  clearAll(): void {
    for (const name of Object.keys(this.cols) as CollectionName[]) this.commit(name, []);
    this.setFuelTypes([]);
    this.setFuelColors({});
    this.log('Cleared all data');
  }

  // ─── Backup / restore ───
  exportAll(): string {
    const out: Record<string, unknown> = { fuelTypes: this._fuelTypes(), fuelColors: this._fuelColors() };
    for (const name of Object.keys(this.cols) as CollectionName[]) out[name] = this.cols[name]!();
    return JSON.stringify(out, null, 2);
  }
  importAll(json: string): void {
    const data = JSON.parse(json) as Record<string, unknown>;
    for (const name of Object.keys(this.cols) as CollectionName[]) {
      if (Array.isArray(data[name])) this.commit(name, data[name] as Entity[]);
    }
    if (Array.isArray(data['fuelTypes'])) this.setFuelTypes(data['fuelTypes'] as string[]);
    if (data['fuelColors'] && typeof data['fuelColors'] === 'object') this.setFuelColors(data['fuelColors'] as Record<string, string>);
    this.log('Imported data backup');
  }

  // ─── internals ───
  private persisted<T extends Entity>(name: CollectionName, seed: T[]): WritableSignal<T[]> {
    let initial = seed;
    try {
      const raw = localStorage.getItem(KEY(name));
      if (raw) initial = (JSON.parse(raw) as T[]).map((r) => (r.id ? r : { ...r, id: newId() }));
      else localStorage.setItem(KEY(name), JSON.stringify(seed));
    } catch { /* ignore */ }
    const sig = signal<T[]>(initial);
    this.cols[name] = sig as unknown as WritableSignal<Entity[]>;
    return sig;
  }
  private commit(name: CollectionName, value: Entity[]): void {
    this.cols[name]!.set(value);
    this.save(KEY(name), value);
  }
  private setFuelTypes(types: string[]): void { this._fuelTypes.set(types); this.save(FUEL_KEY, types); }
  private setFuelColors(colors: Record<string, string>): void { this._fuelColors.set(colors); this.save(FUEL_COLORS_KEY, colors); }
  private loadFuelTypes(): string[] {
    try {
      const raw = localStorage.getItem(FUEL_KEY);
      if (raw) return JSON.parse(raw) as string[];
      localStorage.setItem(FUEL_KEY, JSON.stringify(SEED_FUEL_TYPES));
    } catch { /* ignore */ }
    return [...SEED_FUEL_TYPES];
  }
  private loadFuelColors(): Record<string, string> {
    try {
      const raw = localStorage.getItem(FUEL_COLORS_KEY);
      if (raw) return JSON.parse(raw) as Record<string, string>;
      localStorage.setItem(FUEL_COLORS_KEY, JSON.stringify(SEED_FUEL_COLORS));
    } catch { /* ignore */ }
    return { ...SEED_FUEL_COLORS };
  }
  private save(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }
  private onExternalChange(e: StorageEvent): void {
    if (!e.key || e.newValue == null) return;
    if (e.key === FUEL_KEY) { try { this._fuelTypes.set(JSON.parse(e.newValue)); } catch { /* ignore */ } return; }
    if (e.key === FUEL_COLORS_KEY) { try { this._fuelColors.set(JSON.parse(e.newValue)); } catch { /* ignore */ } return; }
    for (const name of Object.keys(this.cols) as CollectionName[]) {
      if (e.key === KEY(name)) { try { this.cols[name]!.set(JSON.parse(e.newValue)); } catch { /* ignore */ } return; }
    }
  }
}

// ─── helpers ───
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const clone = <T extends Entity>(rows: T[]): T[] => rows.map((r) => ({ ...r, id: newId() }));
const rangeCutoff = (range: 'today' | 'week' | 'month'): string => {
  const days = range === 'today' ? 0 : range === 'week' ? 6 : 29;
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
};
const isoAgo = (daysAgo: number, hour = 8) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ─── Seed data ───
const SEED_FUEL_TYPES = ['Petrol 95', 'Petrol 93', 'Diesel'];
const SEED_FUEL_COLORS: Record<string, string> = { 'Petrol 95': '#0f766e', 'Petrol 93': '#f59e0b', 'Diesel': '#2563eb' };
/** Fuel assigned to each of the 4 nozzles on a dispenser. */
const NOZZLE_FUELS = ['Petrol 95', 'Petrol 93', 'Diesel', 'Petrol 95'];
const DISPENSERS = 4;
const NOZZLES_PER = 4;
const DELTA_PER_NOZZLE = 200; // litres dispensed between the two seed readings

interface Seed {
  stations: Station[]; nozzles: Nozzle[]; sales: FuelSale[]; meters: MeterEntry[];
  expenses: Expense[]; stock: StockItem[]; employees: Employee[]; shifts: Shift[]; prices: Price[];
}

function buildSeed(): Seed {
  const stationDefs = [
    { name: 'Main Street', code: 'MS' },
    { name: 'Highway North', code: 'HN' },
  ];
  const stations: Station[] = stationDefs.map((s) => ({ id: newId(), ...s }));
  const nozzles: Nozzle[] = [];
  const meters: MeterEntry[] = [];
  const stock: StockItem[] = [];
  const sales: FuelSale[] = [];
  const expenses: Expense[] = [];
  const shifts: Shift[] = [];
  const employees: Employee[] = [];

  const prices: Price[] = [
    { id: newId(), fuel: 'Petrol 95', pricePerLitre: 23.4 },
    { id: newId(), fuel: 'Petrol 93', pricePerLitre: 23.0 },
    { id: newId(), fuel: 'Diesel', pricePerLitre: 22.1 },
  ];
  const priceOf = (f: string) => prices.find((p) => p.fuel === f)!.pricePerLitre;

  for (const station of stations) {
    const dispensedByFuel: Record<string, number> = {};
    for (let d = 1; d <= DISPENSERS; d++) {
      for (let n = 1; n <= NOZZLES_PER; n++) {
        const fuel = NOZZLE_FUELS[(n - 1) % NOZZLE_FUELS.length];
        const nozzle: Nozzle = { id: newId(), stationId: station.id, dispenser: `Pump ${d}`, label: `N${n}`, fuel };
        nozzles.push(nozzle);
        const base = 100000 + d * 1000 + n * 100;
        meters.push({ id: newId(), stationId: station.id, nozzleId: nozzle.id, totalizer: base, recordedAt: isoAgo(1, 6), recordedBy: 'System' });
        meters.push({ id: newId(), stationId: station.id, nozzleId: nozzle.id, totalizer: base + DELTA_PER_NOZZLE, recordedAt: isoAgo(0, 14), recordedBy: 'John' });
        dispensedByFuel[fuel] = (dispensedByFuel[fuel] ?? 0) + DELTA_PER_NOZZLE;
      }
    }
    // tanks
    for (const fuel of SEED_FUEL_TYPES) {
      stock.push({ id: newId(), stationId: station.id, fuel, capacity: fuel === 'Diesel' ? 40000 : 30000, current: fuel === 'Diesel' ? 6100 : 18400 });
    }
    // sales matched to dispensed (Diesel deliberately short → a flagged variance)
    for (const fuel of SEED_FUEL_TYPES) {
      const target = dispensedByFuel[fuel] ?? 0;
      const litres = fuel === 'Diesel' ? Math.max(0, target - 40) : target;
      if (litres > 0) {
        sales.push({ id: newId(), stationId: station.id, date: todayISO(), fuel, litres, pricePerLitre: priceOf(fuel), amount: Math.round(litres * priceOf(fuel) * 100) / 100, operator: 'John' });
      }
    }
    expenses.push({ id: newId(), stationId: station.id, date: todayISO(), category: 'Utilities', description: 'Electricity', amount: 4300 });
    shifts.push({ id: newId(), stationId: station.id, operator: 'John', pump: 'Pump 1', scheduledStart: '06:00', scheduledEnd: '14:00', status: 'Active', clockIn: '06:02' });
    shifts.push({ id: newId(), stationId: station.id, operator: 'Mark', pump: 'Pump 2', scheduledStart: '14:00', scheduledEnd: '22:00', status: 'Scheduled' });
  }

  const first = stations[0].id;
  employees.push({ id: newId(), stationId: first, name: 'John Smith', role: 'Pump Operator', shift: 'Morning', phone: '071 234 5678' });
  employees.push({ id: newId(), stationId: first, name: 'Mark Johnson', role: 'Pump Operator', shift: 'Afternoon', phone: '072 345 6789' });
  employees.push({ id: newId(), stationId: stations[1].id, name: 'Paul Williams', role: 'Manager', shift: 'Day', phone: '073 456 7890' });

  return { stations, nozzles, sales, meters, expenses, stock, employees, shifts, prices };
}

const SEED = buildSeed();
const SEED_REPORTS: ReportTemplate[] = [
  { id: newId(), name: 'Weekly Sales', source: 'sales', range: 'week', columns: ['date', 'fuel', 'litres', 'amount', 'operator'] },
  { id: newId(), name: 'Monthly Expenses', source: 'expenses', range: 'month', columns: ['date', 'category', 'description', 'amount'] },
  { id: newId(), name: 'Stock Levels', source: 'inventory', range: 'all', columns: ['fuel', 'capacity', 'current'] },
];
