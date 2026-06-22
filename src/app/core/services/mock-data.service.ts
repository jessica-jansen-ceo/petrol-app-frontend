import { Injectable } from '@angular/core';

/** Shapes returned to the feature screens. Mirror these in the real API later. */
export interface FuelSale {
  date: string;
  fuel: 'Petrol 95' | 'Petrol 93' | 'Diesel';
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

/**
 * In-memory mock data for the POC. Every method returns plain objects so a
 * future HTTP service can be a drop-in replacement returning the same shapes.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  /** Daily revenue for the last 7 days (for the dashboard chart). */
  weeklyRevenue(): { label: string; value: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const vals = [42100, 38900, 45200, 51800, 60400, 72300, 55100];
    return days.map((label, i) => ({ label, value: vals[i] }));
  }

  summary() {
    return {
      todaySales: 55100,
      litresSold: 8123,
      activeShifts: 3,
      lowStockAlerts: 1,
      salesDelta: 12.4, // % vs yesterday
    };
  }

  fuelSales(): FuelSale[] {
    return [
      { date: '2026-06-22', fuel: 'Petrol 95', litres: 320, pricePerLitre: 23.4, amount: 7488, operator: 'Sipho' },
      { date: '2026-06-22', fuel: 'Diesel', litres: 540, pricePerLitre: 22.1, amount: 11934, operator: 'Naledi' },
      { date: '2026-06-22', fuel: 'Petrol 93', litres: 210, pricePerLitre: 23.0, amount: 4830, operator: 'Sipho' },
      { date: '2026-06-21', fuel: 'Petrol 95', litres: 410, pricePerLitre: 23.4, amount: 9594, operator: 'Thabo' },
    ];
  }

  meterReadings(): MeterReading[] {
    return [
      { pump: 'Pump 1', fuel: 'Petrol 95', opening: 102340, closing: 102660, dispensed: 320 },
      { pump: 'Pump 2', fuel: 'Diesel', opening: 88120, closing: 88660, dispensed: 540 },
      { pump: 'Pump 3', fuel: 'Petrol 93', opening: 45010, closing: 45220, dispensed: 210 },
    ];
  }

  expenses(): Expense[] {
    return [
      { date: '2026-06-22', category: 'Maintenance', description: 'Pump 2 nozzle replacement', amount: 1250 },
      { date: '2026-06-21', category: 'Utilities', description: 'Electricity', amount: 4300 },
      { date: '2026-06-20', category: 'Supplies', description: 'Receipt rolls', amount: 380 },
    ];
  }

  stock(): StockItem[] {
    return [
      { fuel: 'Petrol 95', capacity: 30000, current: 18400 },
      { fuel: 'Petrol 93', capacity: 20000, current: 15200 },
      { fuel: 'Diesel', capacity: 40000, current: 6100 },
    ];
  }

  employees(): Employee[] {
    return [
      { name: 'Sipho Dlamini', role: 'Pump Operator', shift: 'Morning', phone: '071 234 5678' },
      { name: 'Naledi Khumalo', role: 'Pump Operator', shift: 'Afternoon', phone: '072 345 6789' },
      { name: 'Thabo Mokoena', role: 'Manager', shift: 'Day', phone: '073 456 7890' },
    ];
  }

  shifts(): Shift[] {
    return [
      { operator: 'Sipho', start: '06:00', end: '14:00', pump: 'Pump 1', status: 'Active' },
      { operator: 'Naledi', start: '14:00', end: '22:00', pump: 'Pump 2', status: 'Active' },
      { operator: 'Thabo', start: '06:00', end: '18:00', pump: 'Office', status: 'Active' },
    ];
  }
}
