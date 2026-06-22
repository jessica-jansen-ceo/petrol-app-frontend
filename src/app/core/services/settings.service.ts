import { Injectable, signal } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';

const KEY = (k: string) => `${CLIENT_CONFIG.clientId}.settings.${k}`;

/** Currencies an admin can switch between in the POC. */
export const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'NGN', 'KES'];

export type Theme = 'light' | 'dark';

/**
 * App-wide, admin-editable settings, persisted to localStorage and exposed as
 * signals so the UI reacts when they change (currency re-formats everywhere,
 * theme flips, low-stock threshold re-flags tanks).
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly currency = signal<string>(this.restore('currency', CLIENT_CONFIG.locale.currency));
  readonly theme = signal<Theme>(this.restore('theme', 'light') as Theme);
  /** Tanks below this fraction of capacity are flagged low. */
  readonly lowStockPct = signal<number>(Number(this.restore('lowStockPct', '0.25')));
  /** Sales-vs-meter variance beyond this % is flagged. */
  readonly reconTolerancePct = signal<number>(0.5);

  constructor() {
    this.applyTheme(this.theme());
  }

  setCurrency(code: string): void {
    this.currency.set(code);
    this.save('currency', code);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    this.save('theme', theme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setLowStockPct(pct: number): void {
    const clamped = Math.min(1, Math.max(0, pct));
    this.lowStockPct.set(clamped);
    this.save('lowStockPct', String(clamped));
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private restore(k: string, fallback: string): string {
    try {
      return localStorage.getItem(KEY(k)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private save(k: string, v: string): void {
    try {
      localStorage.setItem(KEY(k), v);
    } catch {
      /* ignore */
    }
  }
}
