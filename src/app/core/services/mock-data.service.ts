import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';

/** Shapes returned to the feature screens. Mirror these in the real API later. */
export interface FuelSale {
  date: string;
  fuel: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  operator: string;
}
export interface MeterReading {
  pump: string;
  fuel: string;
  opening: number;
  closing: number;
  dispensed: number;
}
export interface Expense {
  date: string;
  category: string;
  description: string;
  amount: number;
}
export interface StockItem {
  fuel: string;
  capacity: number;
  current: number;
}
export interface Employee {
  name: string;
  role: string;
  shift: string;
  phone: string;
}
export interface Shift {
  operator: string;
  start: string;
  end: string;
  pump: string;
  status: 'Active' | 'Closed';
}

const KEY = (name: string) => `${CLIENT_CONFIG.clientId}.data.${name}`;

/**
 * In-memory store, persisted to localStorage and exposed as signals so screens
 * update live when records are added. Seed data is written on first run.
 *
 * To go live: swap each collection for an HTTP call returning the same shapes;
 * the `add*` methods become POSTs. The interfaces above are the API contract.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly _fuelSales = this.persisted<FuelSale>('fuelSales', SEED_FUEL_SALES);
  private readonly _meterReadings = this.persisted<MeterReading>('meterReadings', SEED_METERS);
  private readonly _expenses = this.persisted<Expense>('expenses', SEED_EXPENSES);
  private readonly _stock = this.persisted<StockItem>('stock', SEED_STOCK);
  private readonly _employees = this.persisted<Employee>('employees', SEED_EMPLOYEES);
  private readonly _shifts = this.persisted<Shift>('shifts', SEED_SHIFTS);

  // ─── Read (reactive) ───
  fuelSales(): Signal<FuelSale[]> { return this._fuelSales; }
  meterReadings(): Signal<MeterReading[]> { return this._meterReadings; }
  expenses(): Signal<Expense[]> { return this._expenses; }
  stock(): Signal<StockItem[]> { return this._stock; }
  employees(): Signal<Employee[]> { return this._employees; }
  shifts(): Signal<Shift[]> { return this._shifts; }

  // ─── Create (persisted) ───
  addFuelSale(s: FuelSale) { this.prepend(this._fuelSales, 'fuelSales', s); }
  addMeterReading(r: MeterReading) { this.prepend(this._meterReadings, 'meterReadings', r); }
  addExpense(e: Expense) { this.prepend(this._expenses, 'expenses', e); }
  addStock(s: StockItem) { this.prepend(this._stock, 'stock', s); }
  addEmployee(e: Employee) { this.prepend(this._employees, 'employees', e); }
  addShift(s: Shift) { this.prepend(this._shifts, 'shifts', s); }

  // ─── Derived dashboard data ───
  summary() {
    const sales = this._fuelSales();
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.date === today).reduce((a, s) => a + s.amount, 0);
    const litresSold = sales.filter((s) => s.date === today).reduce((a, s) => a + s.litres, 0);
    const activeShifts = this._shifts().filter((s) => s.status === 'Active').length;
    const lowStockAlerts = this._stock().filter((s) => s.current / s.capacity < 0.25).length;
    return {
      todaySales: todaySales || 55100,
      litresSold: litresSold || 8123,
      activeShifts,
      lowStockAlerts,
      salesDelta: 12.4,
    };
  }

  /** Daily revenue for the last 7 days (for the dashboard chart). */
  weeklyRevenue(): { label: string; value: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const vals = [42100, 38900, 45200, 51800, 60400, 72300, 55100];
    return days.map((label, i) => ({ label, value: vals[i] }));
  }

  // ─── internals ───
  private persisted<T>(name: string, seed: T[]): WritableSignal<T[]> {
    let initial = seed;
    try {
      const raw = localStorage.getItem(KEY(name));
      if (raw) {
        initial = JSON.parse(raw) as T[];
      } else {
        localStorage.setItem(KEY(name), JSON.stringify(seed));
      }
    } catch {
      /* localStorage unavailable — fall back to seed in memory */
    }
    return signal<T[]>(initial);
  }

  private prepend<T>(sig: WritableSignal<T[]>, name: string, item: T) {
    const next = [item, ...sig()];
    sig.set(next);
    try {
      localStorage.setItem(KEY(name), JSON.stringify(next));
    } catch {
      /* ignore persistence errors */
    }
  }
}

// ─── Seed data ───
const SEED_FUEL_SALES: FuelSale[] = [
  { date: '2026-06-22', fuel: 'Petrol 95', litres: 320, pricePerLitre: 23.4, amount: 7488, operator: 'John' },
  { date: '2026-06-22', fuel: 'Diesel', litres: 540, pricePerLitre: 22.1, amount: 11934, operator: 'Mark' },
  { date: '2026-06-22', fuel: 'Petrol 93', litres: 210, pricePerLitre: 23.0, amount: 4830, operator: 'John' },
  { date: '2026-06-21', fuel: 'Petrol 95', litres: 410, pricePerLitre: 23.4, amount: 9594, operator: 'Paul' },
];
const SEED_METERS: MeterReading[] = [
  { pump: 'Pump 1', fuel: 'Petrol 95', opening: 102340, closing: 102660, dispensed: 320 },
  { pump: 'Pump 2', fuel: 'Diesel', opening: 88120, closing: 88660, dispensed: 540 },
  { pump: 'Pump 3', fuel: 'Petrol 93', opening: 45010, closing: 45220, dispensed: 210 },
];
const SEED_EXPENSES: Expense[] = [
  { date: '2026-06-22', category: 'Maintenance', description: 'Pump 2 nozzle replacement', amount: 1250 },
  { date: '2026-06-21', category: 'Utilities', description: 'Electricity', amount: 4300 },
  { date: '2026-06-20', category: 'Supplies', description: 'Receipt rolls', amount: 380 },
];
const SEED_STOCK: StockItem[] = [
  { fuel: 'Petrol 95', capacity: 30000, current: 18400 },
  { fuel: 'Petrol 93', capacity: 20000, current: 15200 },
  { fuel: 'Diesel', capacity: 40000, current: 6100 },
];
const SEED_EMPLOYEES: Employee[] = [
  { name: 'John Smith', role: 'Pump Operator', shift: 'Morning', phone: '071 234 5678' },
  { name: 'Mark Johnson', role: 'Pump Operator', shift: 'Afternoon', phone: '072 345 6789' },
  { name: 'Paul Williams', role: 'Manager', shift: 'Day', phone: '073 456 7890' },
];
const SEED_SHIFTS: Shift[] = [
  { operator: 'John', start: '06:00', end: '14:00', pump: 'Pump 1', status: 'Active' },
  { operator: 'Mark', start: '14:00', end: '22:00', pump: 'Pump 2', status: 'Active' },
  { operator: 'Paul', start: '06:00', end: '18:00', pump: 'Office', status: 'Active' },
];
