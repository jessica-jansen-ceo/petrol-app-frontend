import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

/** Every persisted record carries a stable id. */
export interface Entity { id: string; }

/** Shapes returned to the feature screens. Mirror these in the real API later. */
export interface FuelSale extends Entity {
  date: string;
  fuel: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  operator: string;
}
export interface MeterReading extends Entity {
  pump: string;
  fuel: string;
  opening: number;
  closing: number;
  dispensed: number;
}
export interface Expense extends Entity {
  date: string;
  category: string;
  description: string;
  amount: number;
}
export interface StockItem extends Entity {
  fuel: string;
  capacity: number;
  current: number;
}
export interface Employee extends Entity {
  name: string;
  role: string;
  shift: string;
  phone: string;
}
export type ShiftStatus = 'Scheduled' | 'Active' | 'Closed';
export interface Shift extends Entity {
  operator: string;
  pump: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  clockIn?: string;
  clockOut?: string;
}
export interface Price extends Entity {
  fuel: string;
  pricePerLitre: number;
}
export interface Activity extends Entity {
  time: string;
  user: string;
  action: string;
}

export type CollectionName =
  | 'fuelSales' | 'meterReadings' | 'expenses' | 'stock'
  | 'employees' | 'shifts' | 'prices' | 'activity';

const KEY = (name: string) => `${CLIENT_CONFIG.clientId}.data.${name}`;
const FUEL_KEY = KEY('fuelTypes');
const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now());

/**
 * In-memory store, persisted to localStorage and exposed as signals so screens
 * update live. Writes also propagate to other open tabs/windows via the
 * `storage` event — emulating real-time device↔dashboard sync without a backend.
 *
 * To go live: swap each collection for HTTP calls returning the same shapes;
 * the mutation methods become POST/PUT/DELETE. The interfaces are the contract.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private auth = inject(AuthService);
  private settings = inject(SettingsService);

  private readonly cols: Partial<Record<CollectionName, WritableSignal<Entity[]>>> = {};

  private readonly _fuelSales = this.persisted<FuelSale>('fuelSales', SEED_FUEL_SALES);
  private readonly _meterReadings = this.persisted<MeterReading>('meterReadings', SEED_METERS);
  private readonly _expenses = this.persisted<Expense>('expenses', SEED_EXPENSES);
  private readonly _stock = this.persisted<StockItem>('stock', SEED_STOCK);
  private readonly _employees = this.persisted<Employee>('employees', SEED_EMPLOYEES);
  private readonly _shifts = this.persisted<Shift>('shifts', SEED_SHIFTS);
  private readonly _prices = this.persisted<Price>('prices', SEED_PRICES);
  private readonly _activity = this.persisted<Activity>('activity', []);
  private readonly _fuelTypes = signal<string[]>(this.loadFuelTypes());

  constructor() {
    // Cross-tab / cross-window live sync.
    window.addEventListener('storage', (e) => this.onExternalChange(e));
  }

  // ─── Read (reactive) ───
  fuelSales(): Signal<FuelSale[]> { return this._fuelSales; }
  meterReadings(): Signal<MeterReading[]> { return this._meterReadings; }
  expenses(): Signal<Expense[]> { return this._expenses; }
  stock(): Signal<StockItem[]> { return this._stock; }
  employees(): Signal<Employee[]> { return this._employees; }
  shifts(): Signal<Shift[]> { return this._shifts; }
  prices(): Signal<Price[]> { return this._prices; }
  activity(): Signal<Activity[]> { return this._activity; }
  fuelTypes(): Signal<string[]> { return this._fuelTypes; }

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

  // ─── Domain: pricing & sales ───
  priceFor(fuel: string): number {
    return this._prices().find((p) => p.fuel === fuel)?.pricePerLitre ?? 0;
  }

  /** Record a sale: applies the current price, computes amount, decrements stock. */
  recordSale(input: { date: string; fuel: string; litres: number; operator: string }): FuelSale {
    const pricePerLitre = this.priceFor(input.fuel);
    const amount = Math.round(input.litres * pricePerLitre * 100) / 100;
    const sale = this.add<FuelSale>('fuelSales', {
      date: input.date,
      fuel: input.fuel,
      litres: input.litres,
      pricePerLitre,
      amount,
      operator: input.operator,
    });
    this.adjustStock(input.fuel, -input.litres);
    this.log(`Recorded sale: ${input.litres}L ${input.fuel}`);
    return sale;
  }

  /** Edit a sale, keeping tank stock consistent (return old litres, draw new). */
  editSale(id: string, input: { date: string; fuel: string; litres: number; operator: string }): void {
    const old = this._fuelSales().find((s) => s.id === id);
    if (!old) return;
    this.adjustStock(old.fuel, old.litres); // put the old volume back
    const pricePerLitre = this.priceFor(input.fuel);
    const amount = Math.round(input.litres * pricePerLitre * 100) / 100;
    this.update<FuelSale>('fuelSales', id, { ...input, pricePerLitre, amount });
    this.adjustStock(input.fuel, -input.litres); // draw the new volume
    this.log(`Edited sale ${id.slice(0, 6)}`);
  }

  /** Delete a sale and return its volume to stock. */
  deleteSale(id: string): void {
    const old = this._fuelSales().find((s) => s.id === id);
    if (old) this.adjustStock(old.fuel, old.litres);
    this.remove('fuelSales', id);
    this.log(`Deleted sale ${id.slice(0, 6)}`);
  }

  /** Add/replace a fuel's price in the price book. */
  setPrice(fuel: string, pricePerLitre: number): void {
    const existing = this._prices().find((p) => p.fuel === fuel);
    if (existing) {
      this.update<Price>('prices', existing.id, { pricePerLitre });
    } else {
      this.add<Price>('prices', { fuel, pricePerLitre });
    }
    this.log(`Set price: ${fuel} = ${pricePerLitre}`);
  }

  // ─── Domain: stock ───
  /** Add a delivery (positive) or adjust a tank. Clamps within [0, capacity]. */
  adjustStock(fuel: string, deltaLitres: number): void {
    const item = this._stock().find((s) => s.fuel === fuel);
    if (!item) return;
    const next = Math.min(item.capacity, Math.max(0, item.current + deltaLitres));
    this.update<StockItem>('stock', item.id, { current: next });
  }

  // ─── Domain: fuel types ───
  addFuelType(name: string): boolean {
    const clean = name.trim();
    if (!clean) return false;
    if (this._fuelTypes().some((t) => t.toLowerCase() === clean.toLowerCase())) return false;
    this.setFuelTypes([...this._fuelTypes(), clean]);
    this.log(`Added fuel type: ${clean}`);
    return true;
  }

  /** Rename a fuel everywhere it is referenced. */
  renameFuelType(oldName: string, newName: string): boolean {
    const clean = newName.trim();
    if (!clean || oldName === clean) return false;
    if (this._fuelTypes().some((t) => t.toLowerCase() === clean.toLowerCase())) return false;
    this.setFuelTypes(this._fuelTypes().map((t) => (t === oldName ? clean : t)));
    const rename = <T extends { fuel: string }>(name: CollectionName, sig: WritableSignal<Entity[]>) =>
      this.commit(name, sig().map((r) => ((r as unknown as T).fuel === oldName ? { ...r, fuel: clean } : r)));
    rename('fuelSales', this._fuelSales as unknown as WritableSignal<Entity[]>);
    rename('meterReadings', this._meterReadings as unknown as WritableSignal<Entity[]>);
    rename('stock', this._stock as unknown as WritableSignal<Entity[]>);
    rename('prices', this._prices as unknown as WritableSignal<Entity[]>);
    this.log(`Renamed fuel: ${oldName} → ${clean}`);
    return true;
  }

  /** Why a fuel can't be removed, or null if it can. */
  fuelRemovalBlocker(name: string): string | null {
    if (this._stock().some((s) => s.fuel === name)) return 'a tank still uses it';
    if (this._prices().some((p) => p.fuel === name)) return 'it has a price entry';
    return null;
  }

  removeFuelType(name: string): string | null {
    const blocker = this.fuelRemovalBlocker(name);
    if (blocker) return blocker;
    this.setFuelTypes(this._fuelTypes().filter((t) => t !== name));
    this.log(`Removed fuel type: ${name}`);
    return null;
  }

  // ─── Domain: shifts ───
  clockIn(id: string): void {
    this.update<Shift>('shifts', id, { status: 'Active', clockIn: nowTime() });
    this.log(`Clocked in shift ${id.slice(0, 6)}`);
  }
  clockOut(id: string): void {
    this.update<Shift>('shifts', id, { status: 'Closed', clockOut: nowTime() });
    this.log(`Clocked out shift ${id.slice(0, 6)}`);
  }

  // ─── Domain: reconciliation (sales vs meter) ───
  reconciliation(): {
    fuel: string; soldLitres: number; dispensedLitres: number;
    variance: number; variancePct: number; flagged: boolean;
  }[] {
    const tol = this.settings.reconTolerancePct();
    const fuels = new Set<string>([
      ...this._fuelSales().map((s) => s.fuel),
      ...this._meterReadings().map((m) => m.fuel),
    ]);
    return [...fuels].map((fuel) => {
      const soldLitres = this._fuelSales().filter((s) => s.fuel === fuel).reduce((a, s) => a + s.litres, 0);
      const dispensedLitres = this._meterReadings().filter((m) => m.fuel === fuel).reduce((a, m) => a + m.dispensed, 0);
      const variance = Math.round((soldLitres - dispensedLitres) * 100) / 100;
      const variancePct = dispensedLitres ? Math.round((variance / dispensedLitres) * 1000) / 10 : 0;
      return { fuel, soldLitres, dispensedLitres, variance, variancePct, flagged: Math.abs(variancePct) > tol };
    });
  }

  // ─── Derived dashboard data ───
  summary() {
    const sales = this._fuelSales();
    const today = todayISO();
    const todaySales = sales.filter((s) => s.date === today).reduce((a, s) => a + s.amount, 0);
    const litresSold = sales.filter((s) => s.date === today).reduce((a, s) => a + s.litres, 0);
    const yesterday = sales.filter((s) => s.date < today).reduce((a, s) => a + s.amount, 0);
    const activeShifts = this._shifts().filter((s) => s.status === 'Active').length;
    const threshold = this.settings.lowStockPct();
    const lowStockAlerts = this._stock().filter((s) => s.current / s.capacity < threshold).length;
    const salesDelta = yesterday ? Math.round(((todaySales - yesterday) / yesterday) * 1000) / 10 : 0;
    return { todaySales, litresSold, activeShifts, lowStockAlerts, salesDelta };
  }

  /** Daily revenue for the last 7 calendar days (from real sales). */
  weeklyRevenue(): { label: string; value: number }[] {
    const out: { label: string; value: number }[] = [];
    const sales = this._fuelSales();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const value = sales.filter((s) => s.date === iso).reduce((a, s) => a + s.amount, 0);
      out.push({ label, value });
    }
    return out;
  }

  /** Litres sold per fuel (for the dashboard fuel-mix). */
  fuelMix(): { label: string; value: number }[] {
    const map = new Map<string, number>();
    for (const s of this._fuelSales()) map.set(s.fuel, (map.get(s.fuel) ?? 0) + s.litres);
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }

  // ─── Activity log ───
  log(action: string): void {
    const entry: Activity = {
      id: newId(),
      time: new Date().toISOString(),
      user: this.auth.user()?.displayName ?? 'System',
      action,
    };
    this.commit('activity', [entry, ...this._activity()].slice(0, 200));
  }

  // ─── Backup / restore ───
  exportAll(): string {
    const out: Record<string, unknown> = { fuelTypes: this._fuelTypes() };
    for (const name of Object.keys(this.cols) as CollectionName[]) out[name] = this.cols[name]!();
    return JSON.stringify(out, null, 2);
  }

  importAll(json: string): void {
    const data = JSON.parse(json) as Record<string, unknown>;
    for (const name of Object.keys(this.cols) as CollectionName[]) {
      if (Array.isArray(data[name])) this.commit(name, data[name] as Entity[]);
    }
    if (Array.isArray(data['fuelTypes'])) this.setFuelTypes(data['fuelTypes'] as string[]);
    this.log('Imported data backup');
  }

  // ─── internals ───
  private persisted<T extends Entity>(name: CollectionName, seed: T[]): WritableSignal<T[]> {
    let initial = seed;
    try {
      const raw = localStorage.getItem(KEY(name));
      if (raw) {
        initial = (JSON.parse(raw) as T[]).map((r) => (r.id ? r : { ...r, id: newId() }));
      } else {
        localStorage.setItem(KEY(name), JSON.stringify(seed));
      }
    } catch {
      /* localStorage unavailable — fall back to seed in memory */
    }
    const sig = signal<T[]>(initial);
    this.cols[name] = sig as unknown as WritableSignal<Entity[]>;
    return sig;
  }

  private commit(name: CollectionName, value: Entity[]): void {
    this.cols[name]!.set(value);
    this.save(KEY(name), value);
  }

  private setFuelTypes(types: string[]): void {
    this._fuelTypes.set(types);
    this.save(FUEL_KEY, types);
  }

  private loadFuelTypes(): string[] {
    try {
      const raw = localStorage.getItem(FUEL_KEY);
      if (raw) return JSON.parse(raw) as string[];
      localStorage.setItem(FUEL_KEY, JSON.stringify(SEED_FUEL_TYPES));
    } catch {
      /* ignore */
    }
    return SEED_FUEL_TYPES;
  }

  private save(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore persistence errors */
    }
  }

  /** Reload a collection when another tab writes to it. */
  private onExternalChange(e: StorageEvent): void {
    if (!e.key || e.newValue == null) return;
    if (e.key === FUEL_KEY) {
      try { this._fuelTypes.set(JSON.parse(e.newValue)); } catch { /* ignore */ }
      return;
    }
    for (const name of Object.keys(this.cols) as CollectionName[]) {
      if (e.key === KEY(name)) {
        try { this.cols[name]!.set(JSON.parse(e.newValue)); } catch { /* ignore */ }
        return;
      }
    }
  }
}

// ─── helpers ───
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const id = () => newId();

// ─── Seed data ───
const SEED_FUEL_TYPES: string[] = ['Petrol 95', 'Petrol 93', 'Diesel'];
const SEED_PRICES: Price[] = [
  { id: id(), fuel: 'Petrol 95', pricePerLitre: 23.4 },
  { id: id(), fuel: 'Petrol 93', pricePerLitre: 23.0 },
  { id: id(), fuel: 'Diesel', pricePerLitre: 22.1 },
];
const SEED_FUEL_SALES: FuelSale[] = [
  { id: id(), date: todayISO(), fuel: 'Petrol 95', litres: 320, pricePerLitre: 23.4, amount: 7488, operator: 'John' },
  { id: id(), date: todayISO(), fuel: 'Diesel', litres: 540, pricePerLitre: 22.1, amount: 11934, operator: 'Mark' },
  { id: id(), date: todayISO(), fuel: 'Petrol 93', litres: 210, pricePerLitre: 23.0, amount: 4830, operator: 'John' },
];
const SEED_METERS: MeterReading[] = [
  { id: id(), pump: 'Pump 1', fuel: 'Petrol 95', opening: 102340, closing: 102660, dispensed: 320 },
  { id: id(), pump: 'Pump 2', fuel: 'Diesel', opening: 88120, closing: 88660, dispensed: 540 },
  { id: id(), pump: 'Pump 3', fuel: 'Petrol 93', opening: 45010, closing: 45220, dispensed: 210 },
];
const SEED_EXPENSES: Expense[] = [
  { id: id(), date: todayISO(), category: 'Maintenance', description: 'Pump 2 nozzle replacement', amount: 1250 },
  { id: id(), date: todayISO(), category: 'Utilities', description: 'Electricity', amount: 4300 },
  { id: id(), date: todayISO(), category: 'Supplies', description: 'Receipt rolls', amount: 380 },
];
const SEED_STOCK: StockItem[] = [
  { id: id(), fuel: 'Petrol 95', capacity: 30000, current: 18400 },
  { id: id(), fuel: 'Petrol 93', capacity: 20000, current: 15200 },
  { id: id(), fuel: 'Diesel', capacity: 40000, current: 6100 },
];
const SEED_EMPLOYEES: Employee[] = [
  { id: id(), name: 'John Smith', role: 'Pump Operator', shift: 'Morning', phone: '071 234 5678' },
  { id: id(), name: 'Mark Johnson', role: 'Pump Operator', shift: 'Afternoon', phone: '072 345 6789' },
  { id: id(), name: 'Paul Williams', role: 'Manager', shift: 'Day', phone: '073 456 7890' },
];
const SEED_SHIFTS: Shift[] = [
  { id: id(), operator: 'John', pump: 'Pump 1', scheduledStart: '06:00', scheduledEnd: '14:00', status: 'Active', clockIn: '06:02' },
  { id: id(), operator: 'Mark', pump: 'Pump 2', scheduledStart: '14:00', scheduledEnd: '22:00', status: 'Scheduled' },
  { id: id(), operator: 'Paul', pump: 'Office', scheduledStart: '06:00', scheduledEnd: '18:00', status: 'Active', clockIn: '05:58' },
];
